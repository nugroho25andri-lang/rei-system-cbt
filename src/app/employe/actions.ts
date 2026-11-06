"use server";
import { compare, hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clearEmployeePending, getEmployeePending, setEmployeePending, setEmployeeSession } from "@/lib/employee-session";

export async function verifyEmployeeAction(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const nip = String(form.get("nip") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || !nip) redirect("/employe?error=invalid-input");
  const [rows] = await db.execute("SELECT id,password FROM peserta WHERE email=? AND nip=? LIMIT 1", [email, nip]);
  const participant = (rows as Array<{ id: number; password: string | null }>)[0];
  if (!participant) redirect("/employe?error=not-found");
  await db.execute("UPDATE peserta SET status='Aktif' WHERE id=?", [participant.id]);
  await setEmployeePending(Number(participant.id));
  redirect(participant.password ? "/employe/login?verified=1" : "/employe/buat-password");
}

export async function employeeLoginAction(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const [rows] = await db.execute("SELECT id,password,status FROM peserta WHERE email=? LIMIT 1", [email]);
  const participant = (rows as Array<{ id: number; password: string | null; status: string | null }>)[0];
  if (!participant?.password || !await compare(password, participant.password)) redirect("/employe/login?error=invalid");
  if (participant.status && participant.status.toLowerCase() !== "aktif") redirect("/employe/login?error=inactive");
  await setEmployeeSession(Number(participant.id));
  await clearEmployeePending();
  redirect("/employe/dashboard");
}

export async function createEmployeePasswordAction(form: FormData) {
  const id = await getEmployeePending();
  if (!id) redirect("/employe?error=verify-first");
  const password = String(form.get("password") ?? "");
  const confirmation = String(form.get("password_confirmation") ?? "");
  if (password.length < 6) redirect("/employe/buat-password?error=short");
  if (password !== confirmation) redirect("/employe/buat-password?error=mismatch");
  const [rows] = await db.execute("SELECT password FROM peserta WHERE id=? LIMIT 1", [id]);
  const participant = (rows as Array<{ password: string | null }>)[0];
  if (!participant) redirect("/employe?error=not-found");
  if (participant.password) redirect("/employe/login?error=already-set");
  await db.execute("UPDATE peserta SET password=? WHERE id=?", [await hash(password, 10), id]);
  await clearEmployeePending();
  await setEmployeeSession(id);
  redirect("/employe/dashboard");
}
