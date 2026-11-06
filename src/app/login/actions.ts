"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logAdminActivity } from "@/lib/activity";
import { createAdminSession, isAdminRole } from "@/lib/session";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  if (!username || !password) redirect("/login?error=required");
  const [rows] = await db.execute("SELECT username, password, nama_trainer, role, is_active FROM admins WHERE username = ? LIMIT 1", [username]);
  const admin = (rows as Array<{ username: string; password: string; nama_trainer: string; role: string; is_active: number }>)[0];
  if (!admin || password !== admin.password) {
    await logAdminActivity({ action: "login_failed", username, detail: `Percobaan login gagal untuk username ${username}.` });
    redirect("/login?error=invalid");
  }
  if (Number(admin.is_active) !== 1) {
    await logAdminActivity({ action: "login_failed", username: admin.username, nama: admin.nama_trainer, role: admin.role, detail: "Akun nonaktif mencoba login." });
    redirect("/login?error=inactive");
  }
  if (!isAdminRole(admin.role)) {
    await logAdminActivity({ action: "login_failed", username: admin.username, nama: admin.nama_trainer, role: admin.role, detail: "Role tidak valid." });
    redirect("/login?error=invalid");
  }
  await createAdminSession(admin.username, admin.nama_trainer, admin.role);
  await logAdminActivity({ action: "login", session: { username: admin.username, nama: admin.nama_trainer, role: admin.role }, detail: "Berhasil masuk dashboard admin." });
  redirect("/admin");
}
