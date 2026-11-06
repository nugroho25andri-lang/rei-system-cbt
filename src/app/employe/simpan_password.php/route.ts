import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { clearEmployeePending, getEmployeePending, setEmployeeSession } from "@/lib/employee-session";
import { redirectTo } from "@/lib/redirect";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const id = await getEmployeePending(); const form = await request.formData();
  if (!id) return redirectTo(request, "/employe?error=verify-first");
  const password = String(form.get("password") ?? ""); const confirmation = String(form.get("password_confirmation") ?? "");
  if (password.length < 6) return redirectTo(request, "/employe/buat-password?error=short");
  if (password !== confirmation) return redirectTo(request, "/employe/buat-password?error=mismatch");
  const [rows] = await db.execute("SELECT password FROM peserta WHERE id=? LIMIT 1", [id]);
  const participant = (rows as Array<{ password: string | null }>)[0];
  if (!participant) return redirectTo(request, "/employe?error=not-found");
  if (participant.password) return redirectTo(request, "/employe/login?error=already-set");
  await db.execute("UPDATE peserta SET password=? WHERE id=?", [await hash(password,10),id]);
  await clearEmployeePending(); await setEmployeeSession(id);
  return redirectTo(request, "/employe/dashboard");
}
