import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { loginAction } from "./actions";
import { btnPrimary, inputClass } from "@/components/ui";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAdminSession()) redirect("/admin");
  const { error } = await searchParams;
  const message = error === "required" ? "Mohon lengkapi username dan kode akses." : error === "inactive" ? "Akun ini sedang dinonaktifkan. Hubungi Super Admin." : error ? "Username atau kode akses salah." : "";
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-rei-900 px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl" />
      <section className="relative w-full max-w-[430px] overflow-hidden rounded-2xl border border-gold-500/40 bg-white shadow-2xl shadow-black/40">
        <header className="bg-gradient-to-b from-rei-800 to-rei-900 px-8 pb-7 pt-8 text-center">
          <img src="/logo-rei.png" alt="Raja Emas Indonesia" className="mx-auto h-auto w-[230px] max-w-full" />
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.28em] text-gold-500">Dashboard Admin CBT</p>
        </header>
        <form action={loginAction} className="grid gap-4 px-7 py-7">
          {message && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{message}</p>}
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-rei-900/60">Username Admin
            <input className={inputClass} name="username" autoComplete="username" required autoFocus />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-rei-900/60">Kode Akses / Token
            <input className={inputClass} type="password" name="password" autoComplete="current-password" required />
          </label>
          <button type="submit" className={`${btnPrimary} mt-1 w-full py-3`}>Masuk Panel Admin</button>
          <p className="text-center text-[11px] text-rei-900/40">© {new Date().getFullYear()} Raja Emas Indonesia</p>
        </form>
      </section>
    </main>
  );
}
