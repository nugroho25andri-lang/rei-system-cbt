import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import RekapTable, { type RekapRow } from "./rekap-table";
import { btnPrimary, Card, inputClass, Notice, PageHeader, selectClass, Stat, TableWrap, tdClass, thClass } from "@/components/ui";

export const dynamic = "force-dynamic";
const joins = `
  LEFT JOIN (SELECT j.id_peserta,
    SUM(CASE WHEN TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*1$' THEN COALESCE(j.nilai,0) ELSE 0 END) tes1,
    SUM(CASE WHEN TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*2$' THEN COALESCE(j.nilai,0) ELSE 0 END) tes2,
    SUM(CASE WHEN TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*3$' THEN COALESCE(j.nilai,0) ELSE 0 END) tes3,
    SUM(CASE WHEN TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*4$' THEN COALESCE(j.nilai,0) ELSE 0 END) tes4
    FROM jawaban_peserta j LEFT JOIN soal s ON j.id_soal=s.id GROUP BY j.id_peserta) t14 ON p.id=t14.id_peserta
  LEFT JOIN (SELECT d.id_peserta,d.nilai_akhir FROM penilaian_day5 d JOIN (SELECT id_peserta,MAX(id) max_id FROM penilaian_day5 GROUP BY id_peserta) x ON x.id_peserta=d.id_peserta AND x.max_id=d.id) d5 ON p.id=d5.id_peserta
  LEFT JOIN (SELECT d.id_peserta,d.nilai_akhir FROM penilaian_day6 d JOIN (SELECT id_peserta,MAX(id) max_id FROM penilaian_day6 GROUP BY id_peserta) x ON x.id_peserta=d.id_peserta AND x.max_id=d.id) d6 ON p.id=d6.id_peserta
  LEFT JOIN (SELECT m.id_peserta,m.total_manual FROM penilaian_manual m JOIN (SELECT id_peserta,MAX(id) max_id FROM penilaian_manual GROUP BY id_peserta) x ON x.id_peserta=m.id_peserta AND x.max_id=m.id) aadl ON p.id=aadl.id_peserta`;
const totalExpression = "(COALESCE(t14.tes1,0)+COALESCE(t14.tes2,0)+COALESCE(t14.tes3,0)+COALESCE(t14.tes4,0)+COALESCE(d5.nilai_akhir,0)+COALESCE(d6.nilai_akhir,0)+COALESCE(aadl.total_manual,0))";

type RankRow = { id: number; nip: string; nama_peserta: string; batch: string; cabang: string; total_nilai: number };

function RankTable({ rows, tone, empty }: { rows: RankRow[]; tone: "top" | "bottom"; empty: string }) {
  const totalClass = tone === "top" ? "text-emerald-700" : "text-rose-700";
  const rankClass = tone === "top" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[300px] border-collapse">
        <thead><tr className="border-b border-rei-900/10">
          <th className={`${thClass} w-10`}>#</th>
          <th className={thClass}>Peserta</th>
          <th className={thClass}>Batch</th>
          <th className="whitespace-nowrap px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-rei-900/55">Total</th>
        </tr></thead>
        <tbody className="divide-y divide-rei-900/10">
          {rows.map((row, index) => (
            <tr key={row.id} className="hover:bg-gold-200/15">
              <td className={tdClass}><span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-extrabold ${rankClass}`}>{index + 1}</span></td>
              <td className={tdClass}>
                <span className="block font-semibold leading-tight">{row.nama_peserta}</span>
                <span className="font-mono text-[11px] text-rei-900/50">{row.nip}</span>
              </td>
              <td className={tdClass}>{row.batch}</td>
              <td className={`${tdClass} whitespace-nowrap text-right text-base font-extrabold ${totalClass}`}>{Number(row.total_nilai).toLocaleString("id-ID")}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-xs text-rei-900/50">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
const statsJoins = `
  LEFT JOIN (SELECT j.id_peserta,
    SUM(CASE WHEN TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*1$' THEN COALESCE(j.nilai,0) ELSE 0 END) tes1,
    SUM(CASE WHEN TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*2$' THEN COALESCE(j.nilai,0) ELSE 0 END) tes2,
    SUM(CASE WHEN TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*3$' THEN COALESCE(j.nilai,0) ELSE 0 END) tes3,
    SUM(CASE WHEN TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*4$' THEN COALESCE(j.nilai,0) ELSE 0 END) tes4
    FROM jawaban_peserta j LEFT JOIN soal s ON j.id_soal=s.id GROUP BY j.id_peserta) t14 ON p.id=t14.id_peserta
  LEFT JOIN (SELECT id_peserta,MAX(nilai_akhir) nilai_akhir FROM penilaian_day5 GROUP BY id_peserta) d5 ON p.id=d5.id_peserta
  LEFT JOIN (SELECT id_peserta,MAX(nilai_akhir) nilai_akhir FROM penilaian_day6 GROUP BY id_peserta) d6 ON p.id=d6.id_peserta
  LEFT JOIN (SELECT id_peserta,MAX(total_manual) total_manual FROM penilaian_manual GROUP BY id_peserta) aadl ON p.id=aadl.id_peserta`;

export default async function RekapitulasiPage({ searchParams }: { searchParams: Promise<{ page?: string; batch?: string; q?: string; saved?: string; msg?: string }> }) {
  if (!await getAdminSession()) redirect("/login");
  const params = await searchParams;
  const [kkmRows] = await db.execute("SELECT nilai_kkm FROM kkm LIMIT 1");
  const kkm = Number((kkmRows as Array<{ nilai_kkm: number }>)[0]?.nilai_kkm ?? 750);
  const [latestRows] = await db.execute("SELECT MAX(batch) AS max_batch FROM peserta");
  const latestBatch = String((latestRows as Array<{ max_batch: string | null }>)[0]?.max_batch ?? "");
  const batch = params.batch === undefined ? latestBatch : params.batch.trim();
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * 70;
  const filterSql = ` WHERE (?='' OR p.batch=?) AND (?='' OR p.nama_peserta LIKE ? OR p.nip LIKE ?)`;
  const like = `%${q}%`;
  const [rowsResult, batchesResult, countResult, totalResult, failResult, batchCountResult, topResult, bottomResult] = await Promise.all([
    db.execute(`SELECT p.id,p.nip,p.nama_peserta,p.jabatan,p.batch,p.cabang,COALESCE(t14.tes1,0) tes1,COALESCE(t14.tes2,0) tes2,COALESCE(t14.tes3,0) tes3,COALESCE(t14.tes4,0) tes4,COALESCE(d5.nilai_akhir,0) tes5,COALESCE(d6.nilai_akhir,0) tes6,COALESCE(aadl.total_manual,0) nilai_aadl,${totalExpression} total_nilai FROM peserta p ${joins}${filterSql} ORDER BY p.id DESC LIMIT 70 OFFSET ?`, [batch,batch,q,like,like,offset]),
    db.execute("SELECT DISTINCT batch FROM peserta WHERE batch IS NOT NULL AND batch<>'' ORDER BY batch DESC"),
    db.execute(`SELECT COUNT(*) total FROM peserta p ${filterSql}`, [batch,batch,q,like,like]),
    db.execute(`SELECT COUNT(*) total, SUM(total_nilai>=?) passed FROM (SELECT p.id,${totalExpression} total_nilai FROM peserta p ${statsJoins}) grades`, [kkm]),
    db.execute(`SELECT p.id,p.nip,p.nama_peserta,p.jabatan,p.batch,p.cabang,${totalExpression} total_nilai FROM peserta p ${statsJoins}${filterSql} HAVING total_nilai<? ORDER BY total_nilai ASC,p.nama_peserta ASC`, [batch,batch,q,like,like,kkm]),
    db.execute("SELECT COUNT(*) total FROM peserta WHERE (?='' OR batch=?)", [batch,batch]),
    db.execute(`SELECT p.id,p.nip,p.nama_peserta,p.batch,p.cabang,${totalExpression} total_nilai FROM peserta p ${joins}${filterSql} HAVING total_nilai>0 ORDER BY total_nilai DESC,p.nama_peserta ASC LIMIT 5`, [batch,batch,q,like,like]),
    db.execute(`SELECT p.id,p.nip,p.nama_peserta,p.batch,p.cabang,${totalExpression} total_nilai FROM peserta p ${joins}${filterSql} HAVING total_nilai>0 ORDER BY total_nilai ASC,p.nama_peserta ASC LIMIT 5`, [batch,batch,q,like,like]),
  ]);
  const rows = rowsResult[0] as RekapRow[];
  const totalRecords = Number((countResult[0] as Array<{ total: number }>)[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalRecords / 70));
  const totals = (totalResult[0] as Array<{ total: number; passed: number }>)[0] ?? { total: 0, passed: 0 };
  const batchPassedQuery = batch ? await db.execute(`SELECT COUNT(*) total FROM (SELECT p.id,${totalExpression} total_nilai FROM peserta p ${statsJoins} WHERE p.batch=?) grades WHERE total_nilai>=?`, [batch, kkm]) : null;
  const passedBatch = Number(batchPassedQuery ? (batchPassedQuery[0] as Array<{ total: number }>)[0]?.total ?? 0 : 0);
  const participantCount = Number((batchCountResult[0] as Array<{ total: number }>)[0]?.total ?? 0);
  const failedRows = failResult[0] as unknown as Array<RekapRow & { total_nilai: number }>;
  const topRows = topResult[0] as unknown as RankRow[];
  const bottomRows = bottomResult[0] as unknown as RankRow[];
  const batchOptions = (batchesResult[0] as Array<{ batch: string }>).map((row) => row.batch);
  const stats = [
    { label: "Total Peserta", value: Number(totals.total ?? 0) },
    { label: "Total Batch", value: batchOptions.length },
    { label: "Peserta Batch", value: participantCount },
    { label: "Lulus Semua", value: Number(totals.passed ?? 0) },
    { label: "Lulus Batch", value: passedBatch },
    { label: "Tidak Lulus", value: failedRows.length },
  ];
  return (
    <>
      <PageHeader
        title="Rekapitulasi Nilai"
        description={`Monitoring hasil ujian peserta CBT REI · KKM ${kkm}`}
        actions={<a className={btnPrimary} href={`/rekapitulasi/export?${new URLSearchParams({ batch, q })}`}>Export Excel</a>}
      />
      {params.saved === "1" && <Notice>Nilai berhasil disimpan.</Notice>}
      {params.msg === "kkm-saved" && <Notice>Standar KKM berhasil diperbarui.</Notice>}
      {params.msg === "kkm-invalid" && <Notice kind="error">Nilai KKM tidak valid.</Notice>}

      <Card className="mb-6">
        <form action="/rekapitulasi" className="flex flex-wrap items-end gap-3">
          <select name="batch" defaultValue={batch} className={`${selectClass} max-w-[200px]`}><option value="">Semua batch</option>{batchOptions.map((option) => <option key={option}>{option}</option>)}</select>
          <input className={`${inputClass} max-w-xs`} name="q" defaultValue={q} placeholder="Cari nama atau NIP" />
          <button type="submit" className={btnPrimary}>Filter</button>
        </form>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((item) => <Stat key={item.label} label={item.label} value={item.value} />)}
      </div>

      <Card title={`Rekapitulasi Nilai Peserta (${totalRecords})`} className="mb-6" bodyClassName="px-5 pb-4 pt-2">
        <RekapTable rows={rows} />
      </Card>

      {totalPages > 1 && (
        <nav className="mb-6 flex items-center justify-center gap-3 text-sm font-semibold">
          {page > 1 && <a className="text-gold-600 hover:text-gold-500" href={`/rekapitulasi?${new URLSearchParams({ page: String(page - 1), batch, q })}`}>← Sebelumnya</a>}
          <span className="text-rei-900/60">Halaman {Math.min(page,totalPages)} dari {totalPages}</span>
          {page < totalPages && <a className="text-gold-600 hover:text-gold-500" href={`/rekapitulasi?${new URLSearchParams({ page: String(page + 1), batch, q })}`}>Berikutnya →</a>}
        </nav>
      )}

      <Card
        title="Analisis Nilai"
        description={`5 nilai tertinggi dan 5 nilai terendah berdasarkan total nilai · ${batch ? `Batch ${batch}` : "Semua batch"}${q ? ` · Pencarian "${q}"` : ""} · hanya peserta yang sudah memiliki nilai`}
        className="mb-6"
        bodyClassName="px-5 pb-5 pt-4"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-emerald-800">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-[11px]">▲</span>
              5 Nilai Tertinggi
            </h3>
            <RankTable rows={topRows} tone="top" empty="Belum ada nilai pada filter ini." />
          </section>
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-rose-700">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-50 text-[11px]">▼</span>
              5 Nilai Terendah
            </h3>
            <RankTable rows={bottomRows} tone="bottom" empty="Belum ada nilai pada filter ini." />
          </section>
        </div>
      </Card>

      <Card title={`Belum Lulus (KKM ${kkm}) · ${batch || "Semua batch"}`} bodyClassName="px-5 pb-4 pt-2">
        <TableWrap>
          <thead className="border-b border-rei-900/10"><tr>{["Peserta", "NIP", "Batch", "Total nilai"].map((head) => <th key={head} className={thClass}>{head}</th>)}</tr></thead>
          <tbody className="divide-y divide-rei-900/10">
            {failedRows.map((row) => <tr key={row.id}><td className={`${tdClass} font-semibold`}>{row.nama_peserta}</td><td className={`${tdClass} font-mono text-xs`}>{row.nip}</td><td className={tdClass}>{row.batch}</td><td className={`${tdClass} font-bold text-rose-700`}>{Number(row.total_nilai ?? 0)}</td></tr>)}
            {!failedRows.length && <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-rei-900/50">Tidak ada peserta yang memenuhi filter ini.</td></tr>}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
