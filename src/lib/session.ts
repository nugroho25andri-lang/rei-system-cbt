import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const COOKIE_NAME = "cbt_admin_session";
const ROLES = ["superadmin", "admin", "hr_staff"] as const;

export type AdminRole = (typeof ROLES)[number];
export type AdminSession = { username: string; nama: string; role: AdminRole };

export const ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  hr_staff: "HR Staff",
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function cookieSecure() { return process.env.COOKIE_SECURE === "true"; }
function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET harus diisi minimal 32 karakter.");
  return new TextEncoder().encode(secret);
}

export async function createAdminSession(username: string, nama: string, role: AdminRole = "admin") {
  const token = await new SignJWT({ username, nama, role }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(key());
  (await cookies()).set(COOKIE_NAME, token, { httpOnly: true, secure: cookieSecure(), sameSite: "lax", path: "/", maxAge: 8 * 60 * 60 });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  let username: string;
  try {
    const { payload } = await jwtVerify(token, key());
    if (!isAdminRole(payload.role) || typeof payload.username !== "string") return null;
    username = payload.username;
  } catch {
    return null;
  }

  // Role dan status aktif selalu dibaca dari database supaya perubahan
  // hak akses / penonaktifan akun langsung berlaku tanpa menunggu logout.
  try {
    const [rows] = await db.execute(
      "SELECT username, nama_trainer, role, is_active FROM admins WHERE username = ? LIMIT 1",
      [username],
    );
    const admin = (rows as Array<{ username: string; nama_trainer: string; role: string; is_active: number }>)[0];
    if (!admin || Number(admin.is_active) !== 1 || !isAdminRole(admin.role)) return null;
    return { username: admin.username, nama: admin.nama_trainer, role: admin.role };
  } catch {
    return null;
  }
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(roles: AdminRole[]): Promise<AdminSession> {
  const session = await requireAdminSession();
  if (!roles.includes(session.role)) redirect("/admin?denied=1");
  return session;
}

export async function clearAdminSession() { (await cookies()).delete(COOKIE_NAME); }
