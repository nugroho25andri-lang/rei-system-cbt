import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { btnGhost, btnPrimary, Card, inputClass, PageHeader, selectClass, Stat, TableWrap, tdClass, thClass } from "@/components/ui";

type AnswerGroup = { id_peserta: number; nama_peserta: string; nip: string; batch: string; day: string; pratinjau_jawaban: string; total_skor_auto: number; total_skor_final: number; status_koreksi: string; max_id: number };
type Missing = { id_peserta: number; nama_peserta: string; nip: string; batch: string; day: string };

export default async function JawabanPesertaPage({ searchParams }: { searchParams: Promise<{ q?: string; batch?: string; day?: string }> }) {
  if (!await getAdminSession()) redirect("/login");
  const { q = "", batch = "", day = "" } = await searchParams;
  const [columnRows, batchesRows, daysRows] = await Promise.all([
    db.execute("SELECT column_name AS name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='peserta'"),
    db.execute("SELECT DISTINCT batch FROM peserta WHERE batch IS NOT NULL AND TRIM(batch)<>'' ORDER BY batch"),
    db.execute("SELECT DISTINCT day FROM soal WHERE day IS NOT NULL AND TRIM(day)<>'' ORDER BY CAST(REGEXP_SUBSTR(day,'[0-9]+') AS UNSIGNED),day"),
  ]);
  const columns = (columnRows[0] as Array<{ name: string }>).map((row) => row.name);
  const nameColumn = ["nama_peserta", "nama", "nama_lengkap"].find((name) => columns.includes(name)) ?? "nama_peserta";
  const nipColumn = ["nomor_ujian", "nip", "username"].find((name) => columns.includes(name)) ?? "nip";
  const batchColumn = ["batch", "batch_training", "batch_id"].find((name) => columns.includes(name)) ?? "batch";
  const [answerRows] = await db.execute(`SELECT p.id AS id_peserta,p.\`${nameColumn}\` AS nama_peserta,p.\`${nipColumn}\` AS nip,p.\`${batchColumn}\` AS batch,s.day,GROUP_CONCAT(CONCAT('No. ',s.no_soal,': ',IFNULL(jp.jawaban,'-')) ORDER BY s.no_soal ASC SEPARATOR ' | ') AS pratinjau_jawaban,SUM(IFNULL(jp.skor_auto,0)) AS total_skor_auto,SUM(IFNULL(jp.nilai,0)) AS total_skor_final,CASE WHEN COUNT(jp.id)>0 AND COUNT(CASE WHEN jp.is_dikoreksi=1 THEN 1 END)=COUNT(jp.id) THEN 'Sudah Dikoreksi' ELSE 'Menunggu' END AS status_koreksi,MAX(jp.id) AS max_id FROM peserta p INNER JOIN jawaban_peserta jp ON p.id=jp.id_peserta INNER JOIN soal s ON jp.id_soal=s.id WHERE (?='' OR p.\`${nameColumn}\` LIKE ? OR p.\`${nipColumn}\` LIKE ? OR s.day LIKE ?) AND (?='' OR LOWER(TRIM(s.day))=LOWER(TRIM(?))) AND (?='' OR p.\`${batchColumn}\`=?) GROUP BY p.id,p.\`${nameColumn}\`,p.\`${nipColumn}\`,p.\`${batchColumn}\`,s.day ORDER BY max_id DESC`, [q, `%${q}%`, `%${q}%`, `%${q}%`, day, day, batch, batch]);
  const [day5Rows] = await db.execute(`SELECT p.id AS id_peserta,p.\`${nameColumn}\` AS nama_peserta,p.\`${nipColumn}\` AS nip,p.\`${batchColumn}\` AS batch,d5.id AS id_penilaian,d5.total_nilai,d5.nilai_akhir,d5.updated_at FROM peserta p INNER JOIN penilaian_day5 d5 ON d5.id_peserta=p.id WHERE (?='' OR p.\`${nameColumn}\` LIKE ? OR p.\`${nipColumn}\` LIKE ?) AND (?='' OR LOWER(TRIM(?))='day 5') AND (?='' OR p.\`${batchColumn}\`=?) ORDER BY d5.id DESC`, [q, `%${q}%`, `%${q}%`, day, day, batch, batch]);
  const [missingRows] = await db.execute(`SELECT p.id AS id_peserta,p.\`${nameColumn}\` AS nama_peserta,p.\`${nipColumn}\` AS nip,p.\`${batchColumn}\` AS batch,d.day FROM peserta p CROSS JOIN (SELECT DISTINCT TRIM(day) AS day FROM soal WHERE day IS NOT NULL AND TRIM(day)<>'') d WHERE (?='' OR p.\`${nameColumn}\` LIKE ? OR p.\`${nipColumn}\` LIKE ? OR d.day LIKE ?) AND (?='' OR LOWER(TRIM(d.day))=LOWER(TRIM(?))) AND (?='' OR p.\`${batchColumn}\`=?) AND ((LOWER(TRIM(d.day))='day 5' AND NOT EXISTS (SELECT 1 FROM penilaian_day5 d5 WHERE d5.id_peserta=p.id)) OR (LOWER(TRIM(d.day))<>'day 5' AND NOT EXISTS (SELECT 1 FROM jawaban_peserta jp JOIN soal s2 ON s2.id=jp.id_soal WHERE jp.id_peserta=p.id AND LOWER(TRIM(s2.day))=LOWER(TRIM(d.day))))) ORDER BY p.\`${nameColumn}\`,CAST(REGEXP_SUBSTR(d.day,'[0-9]+') AS UNSIGNED),d.day`, [q, `%${q}%`, `%${q}%`, `%${q}%`, day, day, batch, batch]);
  const answers = answerRows as unknown as AnswerGroup[];
  const day5 = day5Rows as unknown as Array<{ id_peserta: number; nama_peserta: string; nip: string; batch: string; id_penilaian: number; total_nilai: number; nilai_akhir: number; updated_at: string }>;
  const missing = missingRows as unknown as Missing[];
  const missingPeople = new Set(missing.map((row) => row.id_peserta)).size;
  return (
    <>
      <PageHeader title="Jawaban Peserta" description="Pantau jawaban masuk dan status koreksi setiap peserta." />
      <Card className="mb-6">
        <form action="/jawaban-peserta" className="flex flex-wrap items-end gap-3">
          <input className={`${inputClass} max-w-xs`} name="q" defaultValue={q} placeholder="Cari peserta atau day" />
          <select name="batch" defaultValue={batch} className={`${selectClass} max-w-[190px]`}><option value="">Semua batch</option>{(batchesRows[0] as Array<{ batch: string }>).map((row) => <option key={row.batch}>{row.batch}</option>)}</select>
          <select name="day" defaultValue={day} className={`${selectClass} max-w-[170px]`}><option value="">Semua day</option>{(daysRows[0] as Array<{ day: string }>).map((row) => <option key={row.day}>{row.day}</option>)}</select>
          <button type="submit" className={btnPrimary}>Filter</button>
        </form>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Belum mengerjakan" value={missing.length} hint="Baris peserta × day" />
        <Stat label="Peserta terdampak" value={missingPeople} />
        <Stat label="Jawaban terkoreksi" value={answers.filter((row) => row.status_koreksi === "Sudah Dikoreksi").length} />
      </div>

      <Card title={`Jawaban Ujian (${answers.length})`} className="mb-6" bodyClassName="px-5 pb-4 pt-2">
        <TableWrap>
          <thead className="border-b border-rei-900/10"><tr>{["Peserta", "NIP", "Batch", "Day", "Pratinjau Jawaban", "Skor auto", "Skor final", "Status", "Aksi"].map((head) => <th key={head} className={thClass}>{head}</th>)}</tr></thead>
          <tbody className="divide-y divide-rei-900/10">
            {answers.map((row) => (
              <tr key={`${row.id_peserta}-${row.day}`} className="hover:bg-gold-200/15">
                <td className={`${tdClass} font-semibold`}>{row.nama_peserta}</td>
                <td className={`${tdClass} font-mono text-xs`}>{row.nip}</td>
                <td className={tdClass}>{row.batch}</td>
                <td className={`${tdClass} whitespace-nowrap`}>{row.day}</td>
                <td className={`${tdClass} max-w-[360px] text-xs text-rei-900/60`}>{row.pratinjau_jawaban.replace(/\{"__type":"table","rows":\[.*?\]\}/g, "[Jawaban Tabel]")}</td>
                <td className={tdClass}>{Number(row.total_skor_auto ?? 0)}</td>
                <td className={`${tdClass} font-bold`}>{Number(row.total_skor_final ?? 0)}</td>
                <td className={tdClass}>
                  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${row.status_koreksi === "Sudah Dikoreksi" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.status_koreksi}</span>
                </td>
                <td className={tdClass}><a className={btnGhost} href={`/koreksi?peserta=${row.id_peserta}&day=${encodeURIComponent(row.day)}`}>Koreksi</a></td>
              </tr>
            ))}
            {!answers.length && <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-rei-900/50">Belum ada jawaban untuk filter ini.</td></tr>}
          </tbody>
        </TableWrap>
      </Card>

      <Card title={`Penilaian Day 5 (${day5.length})`} className="mb-6" bodyClassName="px-5 pb-4 pt-2">
        <TableWrap>
          <thead className="border-b border-rei-900/10"><tr>{["Peserta", "NIP", "Batch", "Total", "Nilai akhir", "Diperbarui"].map((head) => <th key={head} className={thClass}>{head}</th>)}</tr></thead>
          <tbody className="divide-y divide-rei-900/10">
            {day5.map((row) => <tr key={row.id_penilaian}><td className={`${tdClass} font-semibold`}>{row.nama_peserta}</td><td className={`${tdClass} font-mono text-xs`}>{row.nip}</td><td className={tdClass}>{row.batch}</td><td className={tdClass}>{row.total_nilai}</td><td className={tdClass}>{row.nilai_akhir}</td><td className={`${tdClass} text-xs`}>{String(row.updated_at)}</td></tr>)}
            {!day5.length && <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-rei-900/50">Belum ada penilaian Day 5.</td></tr>}
          </tbody>
        </TableWrap>
      </Card>

      <Card title={`Peserta Belum Tes (${missing.length})`} description="Peserta yang belum memiliki jawaban atau penilaian pada day terpilih." bodyClassName="px-5 pb-4 pt-2">
        <TableWrap>
          <thead className="border-b border-rei-900/10"><tr>{["Peserta", "NIP", "Batch", "Day belum dikerjakan"].map((head) => <th key={head} className={thClass}>{head}</th>)}</tr></thead>
          <tbody className="divide-y divide-rei-900/10">
            {missing.map((row, index) => <tr key={`${row.id_peserta}-${row.day}-${index}`}><td className={`${tdClass} font-semibold`}>{row.nama_peserta}</td><td className={`${tdClass} font-mono text-xs`}>{row.nip}</td><td className={tdClass}>{row.batch}</td><td className={tdClass}>{row.day}</td></tr>)}
            {!missing.length && <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-rei-900/50">Semua peserta sudah mengerjakan day yang difilter.</td></tr>}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
