import { db } from "@/lib/db";
import { Card } from "@/components/ui";

type TopParticipant = { id: number; nama_peserta: string; nip: string; batch: string | null; cabang: string | null; rata: number; jumlah: number };
type BatchTrend = { batch: string; rata: number; jumlah: number; peserta: number };
type DayStat = { day: string; rata: number; jumlah: number; rendah: number; rendah_pct: number; tinggi: number };
type QuestionStat = { day: string; no_soal: number; jenis_soal: string; rata: number; jumlah: number; rendah: number; rendah_pct: number; tinggi: number; tinggi_pct: number };

const LATEST = "JOIN (SELECT id_peserta,id_soal,MAX(id) AS id FROM jawaban_peserta GROUP BY id_peserta,id_soal) latest ON latest.id=j.id";

function num(value: unknown) {
  return Number(value ?? 0);
}
function scoreTone(value: number) {
  if (value < 60) return "text-rose-600";
  if (value < 80) return "text-amber-600";
  return "text-emerald-600";
}
function barTone(value: number) {
  if (value < 60) return "from-rose-400 to-rose-600";
  if (value < 80) return "from-amber-300 to-amber-500";
  return "from-emerald-400 to-emerald-600";
}
function typeLabel(value: string) {
  if (value === "pilihan_ganda") return "PG";
  if (value === "upload") return "Upload";
  return "Esai";
}

async function loadAnalytics() {
  const topSql = `
    SELECT p.id,p.nama_peserta,p.nip,p.batch,p.cabang,
           LEAST(ROUND(SUM(j.nilai)/NULLIF(SUM(s.bobot),0)*100,1),100) rata,COUNT(*) jumlah
    FROM jawaban_peserta j
    JOIN peserta p ON p.id=j.id_peserta
    JOIN soal s ON s.id=j.id_soal
    ${LATEST}
    WHERE j.nilai IS NOT NULL AND s.bobot > 0
    GROUP BY p.id,p.nama_peserta,p.nip,p.batch,p.cabang
    HAVING COUNT(*) >= 3
    ORDER BY rata DESC,jumlah DESC
    LIMIT 10`;
  const batchSql = `
    SELECT COALESCE(NULLIF(TRIM(p.batch),''),'Tanpa batch') batch,
           LEAST(ROUND(SUM(j.nilai)/NULLIF(SUM(s.bobot),0)*100,1),100) rata,COUNT(*) jumlah,COUNT(DISTINCT p.id) peserta
    FROM jawaban_peserta j
    JOIN peserta p ON p.id=j.id_peserta
    JOIN soal s ON s.id=j.id_soal
    ${LATEST}
    WHERE j.nilai IS NOT NULL AND s.bobot > 0
    GROUP BY batch
    ORDER BY CAST(COALESCE(NULLIF(TRIM(p.batch),''),'0') AS UNSIGNED),batch`;
  const daySql = `
    SELECT s.day,LEAST(ROUND(SUM(j.nilai)/NULLIF(SUM(s.bobot),0)*100,1),100) rata,COUNT(*) jumlah,
           SUM(j.nilai < s.bobot*0.6) rendah,ROUND(SUM(j.nilai < s.bobot*0.6)/COUNT(*)*100,1) rendah_pct,
           SUM(j.nilai >= s.bobot*0.8) tinggi
    FROM jawaban_peserta j
    JOIN soal s ON s.id=j.id_soal
    ${LATEST}
    WHERE j.nilai IS NOT NULL AND s.bobot > 0
    GROUP BY s.day
    ORDER BY s.day`;
  const questionSql = (direction: "ASC" | "DESC") => `
    SELECT s.day,s.no_soal,s.jenis_soal,LEAST(ROUND(SUM(j.nilai)/NULLIF(SUM(s.bobot),0)*100,1),100) rata,COUNT(*) jumlah,
           SUM(j.nilai < s.bobot*0.6) rendah,ROUND(SUM(j.nilai < s.bobot*0.6)/COUNT(*)*100,1) rendah_pct,
           SUM(j.nilai >= s.bobot*0.8) tinggi,ROUND(SUM(j.nilai >= s.bobot*0.8)/COUNT(*)*100,1) tinggi_pct
    FROM jawaban_peserta j
    JOIN soal s ON s.id=j.id_soal
    ${LATEST}
    WHERE j.nilai IS NOT NULL AND s.bobot > 0
    GROUP BY s.day,s.no_soal,s.jenis_soal
    HAVING COUNT(*) >= 10
    ORDER BY rata ${direction},jumlah DESC
    LIMIT 6`;

  const [[topRows], [batchRows], [dayRows], [lowRows], [highRows]] = await Promise.all([
    db.execute(topSql),
    db.execute(batchSql),
    db.execute(daySql),
    db.execute(questionSql("ASC")),
    db.execute(questionSql("DESC")),
  ]);

  const top = (topRows as Array<Record<string, unknown>>).map((row) => ({
    id: num(row.id), nama_peserta: String(row.nama_peserta ?? "-"), nip: String(row.nip ?? ""), batch: row.batch ? String(row.batch) : null,
    cabang: row.cabang ? String(row.cabang) : null, rata: num(row.rata), jumlah: num(row.jumlah),
  })) as TopParticipant[];
  const batches = (batchRows as Array<Record<string, unknown>>).map((row) => ({
    batch: String(row.batch ?? "-"), rata: num(row.rata), jumlah: num(row.jumlah), peserta: num(row.peserta),
  })) as BatchTrend[];
  const days = (dayRows as Array<Record<string, unknown>>).map((row) => ({
    day: String(row.day ?? "-"), rata: num(row.rata), jumlah: num(row.jumlah), rendah: num(row.rendah), rendah_pct: num(row.rendah_pct), tinggi: num(row.tinggi),
  })) as DayStat[];
  const mapQuestions = (rows: unknown) => (rows as Array<Record<string, unknown>>).map((row) => ({
    day: String(row.day ?? "-"), no_soal: num(row.no_soal), jenis_soal: String(row.jenis_soal ?? "esai"), rata: num(row.rata),
    jumlah: num(row.jumlah), rendah: num(row.rendah), rendah_pct: num(row.rendah_pct), tinggi: num(row.tinggi), tinggi_pct: num(row.tinggi_pct),
  })) as QuestionStat[];
  return { top, batches, days, low: mapQuestions(lowRows), high: mapQuestions(highRows) };
}

function TopParticipants({ rows }: { rows: TopParticipant[] }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-rei-900/50">Belum ada nilai peserta yang bisa ditampilkan.</p>;
  return (
    <ol className="space-y-3.5">
      {rows.map((row, index) => (
        <li key={row.id}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black ${index < 3 ? "bg-gold-300 text-rei-900" : "bg-rei-100 text-rei-900/55"}`}>{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-rei-900">{row.nama_peserta}</p>
                <p className="truncate text-[11px] text-rei-900/45">Batch {row.batch ?? "-"}{row.cabang ? ` · ${row.cabang}` : ""} · {row.jumlah} jawaban</p>
              </div>
            </div>
            <strong className={`shrink-0 text-sm font-black ${scoreTone(row.rata)}`}>{row.rata.toFixed(1)}</strong>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-rei-900/[0.07]">
            <div className={`h-full rounded-full bg-gradient-to-r ${barTone(row.rata)}`} style={{ width: `${Math.min(Math.max(row.rata, 2), 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function BatchChart({ rows }: { rows: BatchTrend[] }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-rei-900/50">Belum ada data batch.</p>;
  const max = Math.max(100, ...rows.map((row) => row.rata));
  return (
    <div>
      <div className="flex h-44 items-end gap-2 border-b border-rei-900/10 pb-1">
        {rows.map((row, index) => {
          const previous = index > 0 ? rows[index - 1].rata : null;
          const delta = previous === null ? null : row.rata - previous;
          return (
            <div key={row.batch} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className={`text-[11px] font-black ${scoreTone(row.rata)}`}>{row.rata.toFixed(0)}</span>
              {delta !== null && (
                <span className={`text-[9px] font-bold ${delta > 0.05 ? "text-emerald-600" : delta < -0.05 ? "text-rose-600" : "text-rei-900/40"}`}>
                  {delta > 0.05 ? "▲" : delta < -0.05 ? "▼" : "•"} {Math.abs(delta).toFixed(1)}
                </span>
              )}
              <div className={`w-full max-w-14 rounded-t-lg bg-gradient-to-t ${barTone(row.rata)}`} style={{ height: `${Math.max((row.rata / max) * 72, 3)}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {rows.map((row) => (
          <div key={row.batch} className="min-w-0 flex-1 text-center">
            <p className="truncate text-[11px] font-bold text-rei-900">Batch {row.batch}</p>
            <p className="text-[10px] text-rei-900/40">{row.peserta} peserta · {row.jumlah} jawaban</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-rei-900/45">▲ berarti rata-rata nilai batch naik dibanding batch sebelumnya, ▼ berarti turun. Batch diurutkan berdasarkan nomor.</p>
    </div>
  );
}

function DayAnalysis({ rows }: { rows: DayStat[] }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-rei-900/50">Belum ada data nilai per hari.</p>;
  const lowest = [...rows].sort((a, b) => b.rendah_pct - a.rendah_pct)[0];
  return (
    <div>
      <div className="space-y-3.5">
        {rows.map((row) => (
          <div key={row.day}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-rei-900">{row.day}</span>
                {row.day === lowest.day && row.rendah_pct > 0 && <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">Paling banyak nilai rendah</span>}
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="rounded-full bg-rose-50 px-2 py-0.5 font-bold text-rose-600">{row.rendah} rendah</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-600">{row.tinggi} tinggi</span>
                <strong className={`text-sm font-black ${scoreTone(row.rata)}`}>{row.rata.toFixed(1)}</strong>
              </div>
            </div>
            <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-rei-900/[0.07]">
              <div className={`h-full bg-gradient-to-r ${barTone(row.rata)}`} style={{ width: `${Math.min(Math.max(row.rata, 2), 100)}%` }} />
            </div>
            <p className="mt-1 text-[10.5px] text-rei-900/40">{row.jumlah} jawaban · {row.rendah_pct.toFixed(1)}% di bawah 60 · rata-rata skala 0–100</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-lg border border-rei-900/10 bg-[#faf8fa] px-3 py-2 text-[11px] leading-relaxed text-rei-900/55">
        Hari dengan proporsi nilai rendah terbesar: <strong className="text-rei-900">{lowest.day}</strong> ({lowest.rendah_pct.toFixed(1)}% jawaban di bawah 60). Hari dengan rata-rata tertinggi: <strong className="text-rei-900">{[...rows].sort((a, b) => b.rata - a.rata)[0].day}</strong>.
      </p>
    </div>
  );
}

function QuestionTable({ rows, tone }: { rows: QuestionStat[]; tone: "low" | "high" }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-rei-900/50">Belum ada cukup data soal.</p>;
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[430px] border-collapse text-sm">
        <thead className="border-b border-rei-900/10">
          <tr>{["#", "Hari / Soal", "Jenis", "Rata-rata", tone === "low" ? "Nilai < 60" : "Nilai ≥ 80", "Jawaban"].map((head) => <th key={head} className="whitespace-nowrap px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-rei-900/50">{head}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-rei-900/[0.06]">
          {rows.map((row, index) => (
            <tr key={`${row.day}-${row.no_soal}`}>
              <td className="px-2 py-2 text-[11px] font-bold text-rei-900/45">{index + 1}</td>
              <td className="px-2 py-2">
                <p className="text-[12px] font-bold text-rei-900">{row.day}</p>
                <p className="text-[11px] text-rei-900/45">Soal nomor {row.no_soal}</p>
              </td>
              <td className="px-2 py-2 text-[11px] font-semibold text-rei-900/55">{typeLabel(row.jenis_soal)}</td>
              <td className={`px-2 py-2 text-[13px] font-black ${scoreTone(row.rata)}`}>{row.rata.toFixed(1)}</td>
              <td className="px-2 py-2 text-[11px] font-semibold text-rei-900/60">{tone === "low" ? `${row.rendah} (${row.rendah_pct.toFixed(0)}%)` : `${row.tinggi} (${row.tinggi_pct.toFixed(0)}%)`}</td>
              <td className="px-2 py-2 text-[11px] text-rei-900/45">{row.jumlah}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ScoreAnalytics() {
  const { top, batches, days, low, high } = await loadAnalytics();
  const totalAnswers = days.reduce((sum, row) => sum + row.jumlah, 0);
  return (
    <section className="mb-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gold-600">Analitik nilai</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-rei-900">Grafik & analisis hasil ujian</h2>
          <p className="mt-0.5 text-xs text-rei-900/50">Nilai tertinggi, tren per batch, serta soal dan hari dengan nilai rendah/tinggi.</p>
        </div>
        <span className="rounded-full border border-rei-900/10 bg-white px-3 py-1.5 text-[11px] font-bold text-rei-900/60">{totalAnswers.toLocaleString("id-ID")} jawaban dianalisis · skala 0–100</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Nilai Tertinggi Peserta" description="Rata-rata nilai 10 peserta teratas (minimal 3 jawaban).">
          <TopParticipants rows={top} />
        </Card>
        <Card title="Tren Nilai per Batch" description="Apakah rata-rata nilai setiap batch naik atau turun.">
          <BatchChart rows={batches} />
        </Card>
      </div>

      <Card title="Analisis Nilai per Hari Ujian" description="Proporsi nilai rendah (< 60) dan tinggi (≥ 80) di setiap hari." className="mt-6">
        <DayAnalysis rows={days} />
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Soal dengan Nilai Terendah" description="Soal yang paling banyak memperoleh nilai di bawah 60.">
          <QuestionTable rows={low} tone="low" />
        </Card>
        <Card title="Soal dengan Nilai Tertinggi" description="Soal yang paling banyak memperoleh nilai 80 ke atas.">
          <QuestionTable rows={high} tone="high" />
        </Card>
      </div>
    </section>
  );
}
