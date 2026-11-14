import { requireRole } from "@/lib/session";
import { getAccessCodeOverview, getTrainerAnalysis, type TrainerRank } from "@/lib/trainer-evaluation";
import { formatDuration, formatTanggal, formatTanggalShort, todayJakarta } from "@/lib/trainer-evaluation-shared";
import { btnPrimary, Card, Notice, PageHeader, selectClass, Stat } from "@/components/ui";
import TrainerTrendChart from "./trainer-trend-chart";
import SessionTable from "./session-table";
import AccessCodeCard from "./access-code-card";

export const dynamic = "force-dynamic";

const TONE: Record<TrainerRank["tone"], { label: string; className: string }> = {
  good: { label: "Baik", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  watch: { label: "Pantau", className: "bg-amber-50 text-amber-800 border-amber-200" },
  attention: { label: "Perlu evaluasi", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

function RankBadge({ index }: { index: number }) {
  const style = index === 0 ? "bg-gold-500 text-rei-900" : index === 1 ? "bg-rei-900/10 text-rei-900" : index === 2 ? "bg-amber-200 text-amber-900" : "bg-rei-900/5 text-rei-900/60";
  return <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold ${style}`}>{index + 1}</span>;
}

export default async function AnalisisTrainerPage({ searchParams }: { searchParams: Promise<{ batch?: string; trainer?: string }> }) {
  await requireRole(["superadmin", "admin"]);
  const params = await searchParams;
  const [analysis, accessCodes] = await Promise.all([
    getTrainerAnalysis({ batch: params.batch ?? "", trainer: params.trainer ?? "" }),
    getAccessCodeOverview(),
  ]);
  const { totals, ranking, criteria, series, sessions, recommendations } = analysis;
  const hasData = totals.responses > 0;
  const attentionCount = ranking.filter((entry) => entry.tone === "attention").length;
  const watchCount = ranking.filter((entry) => entry.tone === "watch").length;
  const strongestCriterion = [...criteria].filter((item) => item.average > 0).sort((a, b) => b.average - a.average)[0];
  const weakestCriterion = [...criteria].filter((item) => item.average > 0).sort((a, b) => a.average - b.average)[0];
  const filterLabel = [analysis.filters.batch ? `Batch ${analysis.filters.batch}` : "Semua batch", analysis.filters.trainer || "Semua trainer"].join(" · ");
  const exportParams = new URLSearchParams();
  if (analysis.filters.batch) exportParams.set("batch", analysis.filters.batch);
  if (analysis.filters.trainer) exportParams.set("trainer", analysis.filters.trainer);
  const exportQuery = exportParams.toString();
  const exportHref = `/analisis-trainer/export${exportQuery ? `?${exportQuery}` : ""}`;

  return (
    <>
      <PageHeader
        title="Analisis Penilaian Trainer"
        description="Rekap penilaian peserta terhadap trainer: nilai, durasi mengajar, tren per batch, ranking, dan langkah evaluasi."
        actions={<a className={btnPrimary} href="/evaluasi-trainer" target="_blank" rel="noreferrer">Buka Form Penilaian</a>}
      />

      <AccessCodeCard batches={accessCodes} validDate={formatTanggal(todayJakarta())} />

      <Card className="mb-6" bodyClassName="px-5 py-4">
        <form action="/analisis-trainer" className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wide text-rei-900/50">
            Batch
            <select name="batch" defaultValue={analysis.filters.batch} className={`${selectClass} max-w-[220px]`}>
              <option value="">Semua batch</option>
              {analysis.batches.map((batch) => <option key={batch} value={batch}>{/^\d+$/.test(batch) ? `Batch ${batch}` : batch}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wide text-rei-900/50">
            Trainer
            <select name="trainer" defaultValue={analysis.filters.trainer} className={`${selectClass} max-w-[240px]`}>
              <option value="">Semua trainer</option>
              {analysis.trainers.map((trainer) => <option key={trainer} value={trainer}>{trainer}</option>)}
            </select>
          </label>
          <button type="submit" className={btnPrimary}>Terapkan filter</button>
          {(analysis.filters.batch || analysis.filters.trainer) && <a className="px-2 py-2.5 text-xs font-bold text-gold-600 hover:text-gold-500" href="/analisis-trainer">Reset</a>}
          <a className={btnPrimary} href={exportHref}>Export Excel</a>
          <span className="ml-auto text-[11px] text-rei-900/45">Data per {formatTanggalShort(analysis.generatedAt)} · {filterLabel}</span>
        </form>
      </Card>

      {!hasData ? (
        <Card title="Belum ada penilaian trainer">
          <div className="space-y-2 text-sm text-rei-900/65">
            <p>Penilaian akan muncul di sini setelah peserta mengirim form penilaian trainer dari portal peserta atau halaman kode akses.</p>
            <p>Gunakan panel <b>Kode Akses Form Penilaian</b> di atas untuk menyalin kode/tautan yang dibagikan ke peserta.</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Total Penilaian" value={totals.responses} />
            <Stat label="Trainer Dinilai" value={totals.trainers} />
            <Stat label="Peserta Menilai" value={totals.participants} />
            <Stat label="Rata-rata Nilai" value={`${totals.average.toFixed(2)}/5`} hint={worstHint(totals.average)} />
            <Stat label="Sesi Mengajar" value={totals.sessions} />
            <Stat label="Total Durasi" value={formatDuration(totals.minutes)} hint={`${attentionCount} perlu evaluasi · ${watchCount} dipantau`} />
          </div>

          <Card title="Ranking Nilai Trainer" description="Diurutkan dari rata-rata nilai tertinggi · nama peserta dan trainer hanya terlihat oleh admin" className="mb-6" bodyClassName="px-5 pb-4 pt-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-rei-900/10 text-[11px] uppercase tracking-wide text-rei-900/55">
                    <th className="w-12 px-3 py-2.5 text-left">#</th>
                    <th className="px-3 py-2.5 text-left">Trainer</th>
                    <th className="px-3 py-2.5 text-left">Batch</th>
                    <th className="px-3 py-2.5 text-right">Nilai rata-rata</th>
                    <th className="px-3 py-2.5 text-right">Penilaian</th>
                    <th className="px-3 py-2.5 text-right">Sesi</th>
                    <th className="px-3 py-2.5 text-right">Durasi</th>
                    <th className="px-3 py-2.5 text-center">Tren</th>
                    <th className="px-3 py-2.5 text-left">Aspek terlemah</th>
                    <th className="px-3 py-2.5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rei-900/10">
                  {ranking.map((entry, index) => (
                    <tr key={entry.trainer} className="hover:bg-gold-200/15">
                      <td className="px-3 py-3"><RankBadge index={index} /></td>
                      <td className="px-3 py-3 align-top">
                        <span className="block font-bold text-rei-900">{entry.trainer}</span>
                        <span className="text-[11px] text-rei-900/45">Terakhir dinilai {formatTanggalShort(entry.lastDate)}</span>
                      </td>
                      <td className="px-3 py-3 align-top text-rei-900/70">{entry.batches.length ? entry.batches.map((batch) => (/^\d+$/.test(batch) ? `B${batch}` : batch)).join(", ") : "-"}</td>
                      <td className="px-3 py-3 text-right align-top text-base font-extrabold text-rei-900">{entry.average.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right align-top text-rei-900/70">{entry.responses}</td>
                      <td className="px-3 py-3 text-right align-top text-rei-900/70">{entry.sessions}</td>
                      <td className="px-3 py-3 text-right align-top text-rei-900/70">{formatDuration(entry.minutes)}</td>
                      <td className="px-3 py-3 text-center align-top">
                        {entry.trend ? (
                          <span className={`whitespace-nowrap text-xs font-extrabold ${entry.trend.delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {entry.trend.delta >= 0 ? "▲" : "▼"} {Math.abs(entry.trend.delta).toFixed(2)}
                          </span>
                        ) : <span className="text-xs text-rei-900/35">—</span>}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className="block text-xs font-semibold text-rei-900/80">{entry.weakest.label}</span>
                        <span className="text-[11px] text-rei-900/45">{entry.weakest.value.toFixed(2)}/5</span>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-bold ${TONE[entry.tone].className}`}>{TONE[entry.tone].label}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title="Grafik Tren Nilai per Batch"
            description="Pergerakan rata-rata nilai masing-masing trainer antarbatch. ▲ naik, ▼ turun dibanding batch sebelumnya."
            className="mb-6"
          >
            <TrainerTrendChart series={series} batches={analysis.batches} />
          </Card>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card title="Rata-rata per Aspek" description={`Aspek terkuat: ${strongestCriterion?.label ?? "-"} · terlemah: ${weakestCriterion?.label ?? "-"}`}>
              <ul className="space-y-3">
                {criteria.map((criterion) => (
                  <li key={criterion.key}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="text-xs font-bold text-rei-900/80">{criterion.label}</span>
                      <span className="whitespace-nowrap text-xs font-extrabold text-rei-900">
                        {criterion.average.toFixed(2)}
                        {criterion.lowCount > 0 && <span className="ml-2 font-semibold text-rose-600">{criterion.lowCount} nilai ≤2</span>}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-rei-900/10">
                      <div className={`h-full rounded-full ${criterion.average >= 4.5 ? "bg-emerald-500" : criterion.average >= 4 ? "bg-gold-500" : criterion.average >= 3.5 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${(criterion.average / 5) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Langkah Berikutnya" description="Rekomendasi tindak lanjut untuk trainer yang perlu diperbaiki atau dievaluasi">
              {!recommendations.length ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Semua trainer berada pada kategori baik pada filter ini. Pertahankan kualitas dan lanjutkan pemantauan berkala.
                </p>
              ) : (
                <ol className="space-y-3">
                  {recommendations.map((item) => (
                    <li key={item.trainer} className={`rounded-xl border px-4 py-3 ${item.tone === "attention" ? "border-rose-200 bg-rose-50/60" : "border-amber-200 bg-amber-50/60"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <b className="text-sm text-rei-900">{item.trainer}</b>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${TONE[item.tone].className}`}>{TONE[item.tone].label}</span>
                      </div>
                      <p className="mt-1 text-xs text-rei-900/65">{item.headline}</p>
                      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-rei-900/75">
                        {item.steps.map((step) => <li key={step}>{step}</li>)}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          {/*
            Catatan: peserta yang menilai selalu tampil dengan nama lengkap di sini
            karena halaman ini hanya bisa dibuka role superadmin/admin.
          */}
          <Card
            title="Detail Penilaian Peserta"
            description={`Nama peserta ditampilkan lengkap untuk admin · ${sessions.length} penilaian terbaru`}
            className="mb-6"
            bodyClassName="px-5 pb-5 pt-4"
          >
            <SessionTable rows={sessions} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Hal Terbaik dari Sesi" description="Kutipan masukan positif peserta">
              {analysis.comments.good.length ? (
                <ul className="space-y-2 text-sm text-rei-900/75">
                  {analysis.comments.good.map((comment, index) => <li key={`${index}-${comment.slice(0, 20)}`} className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2">“{comment}”</li>)}
                </ul>
              ) : <p className="text-sm text-rei-900/50">Belum ada masukan.</p>}
            </Card>
            <Card title="Saran Perbaikan" description="Kutipan masukan yang perlu ditindaklanjuti">
              {analysis.comments.improve.length ? (
                <ul className="space-y-2 text-sm text-rei-900/75">
                  {analysis.comments.improve.map((comment, index) => <li key={`${index}-${comment.slice(0, 20)}`} className="rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">“{comment}”</li>)}
                </ul>
              ) : <p className="text-sm text-rei-900/50">Belum ada saran.</p>}
            </Card>
          </div>
        </>
      )}
      <Notice kind="info">
        Penilaian peserta bersifat anonim pada form peserta. Identitas lengkap peserta hanya ditampilkan di halaman admin ini.
      </Notice>
    </>
  );
}

function worstHint(average: number) {
  if (average >= 4.5) return "Kualitas sangat baik";
  if (average >= 4) return "Kualitas baik";
  if (average >= 3.5) return "Perlu pemantauan";
  return "Perlu evaluasi";
}
