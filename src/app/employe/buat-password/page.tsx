import { redirect } from "next/navigation";
import { getEmployeePending } from "@/lib/employee-session";
import { createEmployeePasswordAction } from "../actions";

export default async function CreateEmployeePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!await getEmployeePending()) redirect("/employe?error=verify-first");
  const { error } = await searchParams;
  const message = error === "short" ? "Password minimal 6 karakter." : error === "mismatch" ? "Konfirmasi password tidak sama." : "";
  return <main className="login-shell"><section className="login-card"><header><h1>AKTIVASI AKUN CBT</h1><p>RAJA EMAS INDONESIA</p></header><form action={createEmployeePasswordAction}>
    {message && <p className="error" role="alert">{message}</p>}<p>Email dan NIP sudah terverifikasi. Buat password untuk masuk ke CBT.</p>
    <label>Password<input name="password" type="password" minLength={6} required autoComplete="new-password" /></label><label>Konfirmasi Password<input name="password_confirmation" type="password" minLength={6} required autoComplete="new-password" /></label><button type="submit">Simpan Password dan Masuk</button>
  </form><a className="employee-back" href="/employe">Kembali</a></section></main>;
}
