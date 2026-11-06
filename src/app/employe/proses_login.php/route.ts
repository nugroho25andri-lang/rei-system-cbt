import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { clearEmployeePending, setEmployeeSession } from "@/lib/employee-session";
import { redirectTo } from "@/lib/redirect";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const form = await request.formData(); const email = String(form.get("email") ?? "").trim(); const password = String(form.get("password") ?? "");
  const [rows] = await db.execute("SELECT id,password,status FROM peserta WHERE email=? LIMIT 1", [email]);
  const participant = (rows as Array<{ id: number; password: string | null; status: string | null }>)[0];
  if (!participant?.password || !await compare(password, participant.password)) return redirectTo(request, "/employe/login?error=invalid");
  if (participant.status && participant.status.toLowerCase() !== "aktif") return redirectTo(request, "/employe/login?error=inactive");
  await setEmployeeSession(Number(participant.id)); await clearEmployeePending();
  return redirectTo(request, "/employe/dashboard");
}
