import { db } from "@/lib/db";
import { setEmployeePending } from "@/lib/employee-session";
import { redirectTo } from "@/lib/redirect";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim(); const nip = String(form.get("nip") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || !nip) return redirectTo(request, "/employe?error=invalid-input");
  const [rows] = await db.execute("SELECT id,password FROM peserta WHERE email=? AND nip=? LIMIT 1", [email,nip]);
  const participant = (rows as Array<{ id: number; password: string | null }>)[0];
  if (!participant) return redirectTo(request, "/employe?error=not-found");
  await db.execute("UPDATE peserta SET status='Aktif' WHERE id=?", [participant.id]);
  await setEmployeePending(Number(participant.id));
  return redirectTo(request, participant.password ? "/employe/login?verified=1" : "/employe/buat-password");
}
