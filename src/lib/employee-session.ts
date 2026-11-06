import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cookieSecure } from "@/lib/session";

const employeeCookie = "cbt_employee_session";
const pendingCookie = "cbt_employee_pending";
function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET harus diisi minimal 32 karakter.");
  return new TextEncoder().encode(secret);
}
async function makeToken(id: number, purpose: string, expiry: string) {
  return new SignJWT({ pesertaId: id, purpose }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expiry).sign(secretKey());
}
async function readToken(name: string, purpose: string) {
  const token = (await cookies()).get(name)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.purpose === purpose && Number.isInteger(payload.pesertaId) ? Number(payload.pesertaId) : null;
  } catch { return null; }
}
export async function setEmployeePending(id: number) {
  (await cookies()).set(pendingCookie, await makeToken(id, "pending", "20m"), { httpOnly: true, secure: cookieSecure(), sameSite: "lax", path: "/", maxAge: 1200 });
}
export async function getEmployeePending() { return readToken(pendingCookie, "pending"); }
export async function clearEmployeePending() { (await cookies()).delete(pendingCookie); }
export async function setEmployeeSession(id: number) {
  (await cookies()).set(employeeCookie, await makeToken(id, "employee", "8h"), { httpOnly: true, secure: cookieSecure(), sameSite: "lax", path: "/", maxAge: 8 * 60 * 60 });
}
export async function getEmployeeSession() { return readToken(employeeCookie, "employee"); }
export async function clearEmployeeSession() { (await cookies()).delete(employeeCookie); }
