"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

const MANAGE_ROLES = ["admin", "hr_staff"] as const;

type Target = { id: number; username: string; role: string };

async function targetAccount(form: FormData): Promise<Target> {
  const id = Number(form.get("id") ?? 0);
  if (!Number.isInteger(id) || id <= 0) redirect("/akun?msg=notfound");
  const [rows] = await db.execute("SELECT id, username, role FROM admins WHERE id = ? LIMIT 1", [id]);
  const target = (rows as Target[])[0];
  if (!target) redirect("/akun?msg=notfound");
  if (target.role === "superadmin") redirect("/akun?msg=protected");
  return target;
}

export async function createAkunAction(form: FormData) {
  const session = await requireRole(["superadmin"]);
  const username = String(form.get("username") ?? "").trim();
  const nama = String(form.get("nama") ?? "").trim();
  const password = String(form.get("password") ?? "").trim();
  const role = String(form.get("role") ?? "").trim();

  if (!/^[A-Za-z0-9._-]{3,50}$/.test(username)) redirect("/akun?msg=invalid-username");
  if (nama.length < 2 || nama.length > 100) redirect("/akun?msg=invalid-nama");
  if (password.length < 6) redirect("/akun?msg=invalid-password");
  if (!(MANAGE_ROLES as readonly string[]).includes(role)) redirect("/akun?msg=invalid-role");

  const [duplicates] = await db.execute("SELECT id FROM admins WHERE LOWER(username) = LOWER(?) LIMIT 1", [username]);
  if ((duplicates as unknown[]).length) redirect("/akun?msg=exists");

  await db.execute(
    "INSERT INTO admins (username, password, nama_trainer, role, is_active) VALUES (?, ?, ?, ?, 1)",
    [username, password, nama, role],
  );
  await logAdminActivity({
    action: "account_create",
    session,
    entity: "admins",
    detail: `Akun ${username} (${role}) dibuat untuk ${nama}.`,
  });
  revalidatePath("/akun");
  redirect("/akun?msg=created");
}

export async function resetPasswordAkunAction(form: FormData) {
  const session = await requireRole(["superadmin"]);
  const target = await targetAccount(form);
  const password = String(form.get("password") ?? "").trim();
  if (password.length < 6) redirect("/akun?msg=invalid-password");

  await db.execute("UPDATE admins SET password = ? WHERE id = ?", [password, target.id]);
  await logAdminActivity({
    action: "account_password",
    session,
    entity: "admins",
    entityId: target.id,
    detail: `Password akun ${target.username} direset.`,
  });
  revalidatePath("/akun");
  redirect("/akun?msg=password");
}

export async function updateRoleAkunAction(form: FormData) {
  const session = await requireRole(["superadmin"]);
  const target = await targetAccount(form);
  const role = String(form.get("role") ?? "").trim();
  if (!(MANAGE_ROLES as readonly string[]).includes(role)) redirect("/akun?msg=invalid-role");

  await db.execute("UPDATE admins SET role = ? WHERE id = ?", [role, target.id]);
  await logAdminActivity({
    action: "account_role",
    session,
    entity: "admins",
    entityId: target.id,
    detail: `Role akun ${target.username} diubah dari ${target.role} menjadi ${role}.`,
  });
  revalidatePath("/akun");
  redirect("/akun?msg=role");
}

export async function toggleAkunAction(form: FormData) {
  const session = await requireRole(["superadmin"]);
  const target = await targetAccount(form);
  const active = String(form.get("is_active") ?? "") === "1" ? 1 : 0;

  await db.execute("UPDATE admins SET is_active = ? WHERE id = ?", [active, target.id]);
  await logAdminActivity({
    action: "account_status",
    session,
    entity: "admins",
    entityId: target.id,
    detail: `Akun ${target.username} ${active ? "diaktifkan" : "dinonaktifkan"}.`,
  });
  revalidatePath("/akun");
  redirect(`/akun?msg=${active ? "activated" : "deactivated"}`);
}
