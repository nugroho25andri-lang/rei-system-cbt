import { getAccessCodeBatch, getBatchContext } from "@/lib/trainer-evaluation";
import { maskIdentity } from "@/lib/trainer-evaluation-shared";
import TrainerEvaluationForm from "@/components/trainer-evaluation-form";

export const dynamic = "force-dynamic";

export default async function PublicTrainerEvaluationPage({ searchParams }: { searchParams: Promise<{ kode?: string }> }) {
  const params = await searchParams;
  const code = String(params.kode ?? "").trim();
  const batch = code ? await getAccessCodeBatch(code) : null;
  const context = batch ? await getBatchContext(batch.label) : null;

  return (
    <main className="min-h-screen bg-[#f6f3f6] px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-rei-900 to-rei-800 px-5 py-4 text-white shadow-lg shadow-rei-900/20">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-400">Raja Emas Indonesia</span>
            <h1 className="text-lg font-extrabold">Penilaian Trainer</h1>
          </div>
          <a href="/employe" className="rounded-lg border border-white/25 px-3 py-2 text-xs font-bold text-gold-200 transition hover:bg-white/10">Login peserta</a>
        </header>

        {!batch && (
          <section className="rounded-2xl border border-rei-900/10 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-rei-900">Masuk dengan kode akses batch</h2>
            <p className="mt-1 text-sm text-rei-900/60">Masukkan kode akses yang diberikan admin untuk membuka form penilaian trainer batch Anda.</p>
            {code && (
              <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                Kode akses tidak valid atau sudah tidak aktif. Kode diperbarui otomatis setiap hari — minta kode terbaru kepada admin.
              </p>
            )}
            <form action="/evaluasi-trainer" method="get" className="mt-4 flex flex-wrap items-end gap-3">
              <label className="grid flex-1 gap-1 text-xs font-bold text-rei-900/70">
                Kode akses
                <input name="kode" required defaultValue={code} className="w-full min-w-0 rounded-lg border border-rei-900/15 bg-white px-3 py-2.5 text-sm text-rei-900 outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30" placeholder="Contoh: B44-7KQ2MX" autoComplete="off" />
              </label>
              <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-bold text-rei-900 shadow-sm transition hover:bg-gold-400">Buka form</button>
            </form>
            <p className="mt-4 text-[11px] text-rei-900/50">Nama penilai akan disensor pada form. Identitas lengkap hanya terlihat oleh admin.</p>
          </section>
        )}

        {batch && context && (
          <>
            <section className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gold-300 bg-gold-200/50 px-5 py-3">
              <div className="text-sm font-bold text-rei-900">{batch.label} · identitas penilai <span className="font-mono tracking-[0.3em]">{maskIdentity()}</span></div>
              <a href="/evaluasi-trainer" className="text-xs font-bold text-gold-600 hover:text-gold-500">Ganti kode</a>
            </section>
            {!context.trainers.length ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                Daftar trainer untuk {batch.label} belum tersedia. Silakan hubungi admin.
              </p>
            ) : (
              <TrainerEvaluationForm
                mode="kode"
                evaluatorLabel={maskIdentity()}
                context={context}
                initialCode={code}
                showHistory={false}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
