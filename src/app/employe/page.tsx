import { redirect } from "next/navigation";
import { getEmployeeSession } from "@/lib/employee-session";
import { verifyEmployeeAction } from "./actions";

const errors: Record<string, string> = { "invalid-input": "Email dan NIP wajib diisi dengan benar.", "not-found": "Email dan NIP tidak cocok atau belum didaftarkan oleh admin.", "verify-first": "Silakan verifikasi email dan NIP terlebih dahulu." };
export default async function EmployeeVerificationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getEmployeeSession()) redirect("/employe/dashboard");
  const { error } = await searchParams;
  return <main className="login-shell"><section className="login-card"><header><h1>LOGIN PESERTA CBT</h1><p>RAJA EMAS INDONESIA</p></header><form action={verifyEmployeeAction}>
    {error && <p className="error" role="alert">{errors[error] ?? "Terjadi kesalahan."}</p>}
    <p>Masukkan email dan NIP yang telah didaftarkan oleh admin.</p>
    <label>Email Terdaftar<input name="email" type="email" autoComplete="email" required /></label>
    <label>NIP<input name="nip" required /></label><button type="submit">Verifikasi Data</button>
  </form></section></main>;
}
