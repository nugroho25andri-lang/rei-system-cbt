import { redirect } from "next/navigation";
import { getEmployeeSession } from "@/lib/employee-session";
import { employeeLoginAction } from "../actions";

const errors: Record<string, string> = { invalid: "Email atau password salah.", inactive: "Akun peserta sedang tidak aktif.", "already-set": "Password akun ini sudah dibuat. Silakan login." };
export default async function EmployeeLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; verified?: string }> }) {
  if (await getEmployeeSession()) redirect("/employe/dashboard");
  const { error, verified } = await searchParams;
  return <main className="login-shell"><section className="login-card"><header><h1>LOGIN PESERTA CBT</h1><p>RAJA EMAS INDONESIA</p></header><form action={employeeLoginAction}>
    {verified && <p className="notice">Email dan NIP terverifikasi. Masukkan password.</p>}{error && <p className="error" role="alert">{errors[error] ?? "Terjadi kesalahan."}</p>}
    <label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Password<input name="password" type="password" required autoComplete="current-password" /></label><button type="submit">Masuk ke CBT</button>
  </form><a className="employee-back" href="/employe">Kembali ke verifikasi email &amp; NIP</a></section></main>;
}
