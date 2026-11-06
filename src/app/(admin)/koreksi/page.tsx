import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import KoreksiTable, { type KoreksiRow } from "./koreksi-table";
import { btnPrimary, Card, inputClass, Notice, PageHeader, selectClass, Stat } from "@/components/ui";

const messages: Record<string, string> = { saved: "Koreksi berhasil disimpan.", empty: "Tidak ada nilai yang diisi.", error: "Gagal menyimpan koreksi.", invalid: "Data koreksi tidak valid." };

export default async function KoreksiPage({ searchParams }: { searchParams: Promise<{ q?: string; batch?: string; day?: string; status?: string; msg?: string; peserta?: string }> }) {
  if (!await getAdminSession()) redirect("/login");
  const { q = "", batch = "", day = "", status = "", msg, peserta } = await searchParams;
  const [batchesRows, daysRows] = await Promise.all([
    db.execute("SELECT DISTINCT batch FROM peserta WHERE batch IS NOT NULL AND TRIM(batch)<>'' ORDER BY batch"),
    db.execute("SELECT DISTINCT day FROM soal WHERE day IS NOT NULL AND TRIM(day)<>'' ORDER BY CAST(REGEXP_SUBSTR(day,'[0-9]+') AS UNSIGNED),day"),
  ]);
  const [rows] = await db.execute(
    `SELECT p.id AS id_peserta, p.nama_peserta, p.nip, p.batch, s.day,
       COUNT(DISTINCT jp.id_soal) AS jumlah,
       COUNT(DISTINCT CASE WHEN jp.is_dikoreksi=1 THEN jp.id_soal END) AS dikoreksi,
       SUM(COALESCE(jp.skor_auto,0)) AS skor_auto,
       SUM(COALESCE(jp.nilai,0)) AS skor_final,
       SUM(COALESCE(s.bobot,0)) AS total_bobot
     FROM peserta p
     INNER JOIN jawaban_peserta jp ON jp.id_peserta=p.id
     INNER JOIN soal s ON s.id=jp.id_soal
     WHERE (?='' OR p.nama_peserta LIKE ? OR p.nip LIKE ?)
       AND (?='' OR p.batch=?)
       AND (?='' OR LOWER(TRIM(s.day))=LOWER(TRIM(?)))
     GROUP BY p.id,p.nama_peserta,p.nip,p.batch,s.day
     HAVING (?='' OR (?='pending' AND dikoreksi<jumlah) OR (?='done' AND dikoreksi>=jumlah))
     ORDER BY p.nama_peserta ASC, CAST(REGEXP_SUBSTR(s.day,'[0-9]+') AS UNSIGNED), s.day`,
    [q, `%${q}%`, `%${q}%`, batch, batch, day, day, status, status, status],
  );
  const list = rows as KoreksiRow[];
  const pending = list.filter((row) => row.dikoreksi < row.jumlah).length;
  const done = list.filter((row) => row.dikoreksi >= row.jumlah).length;
  const initialOpen = peserta && Number.isInteger(Number(peserta)) && Number(peserta) > 0 ? { peserta: Number(peserta), day: day || undefined } : undefined;
  return (
    <>
      <PageHeader title="Koreksi Jawaban" description="Klik Koreksi untuk membuka lembar penilaian. Nilai final langsung tersimpan ke database." />
      {msg && messages[msg] && <Notice kind={msg === "saved" ? "success" : msg === "empty" ? "info" : "error"}>{messages[msg]}</Notice>}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total Kelompok" value={list.length} hint="Peserta × day" />
        <Stat label="Belum Selesai" value={pending} />
        <Stat label="Sudah Dikoreksi" value={done} />
      </div>

      <Card
        title="Daftar Jawaban"
        description="Detail jawaban dan input nilai tampil dalam popup tanpa pindah halaman."
        actions={
          <form action="/koreksi" className="flex flex-wrap items-end gap-2">
            <input className={`${inputClass} max-w-52`} name="q" defaultValue={q} placeholder="Cari nama atau NIP" />
            <select name="batch" defaultValue={batch} className={`${selectClass} max-w-[150px]`}><option value="">Semua batch</option>{(batchesRows[0] as Array<{ batch: string }>).map((row) => <option key={row.batch}>{row.batch}</option>)}</select>
            <select name="day" defaultValue={day} className={`${selectClass} max-w-[140px]`}><option value="">Semua day</option>{(daysRows[0] as Array<{ day: string }>).map((row) => <option key={row.day}>{row.day}</option>)}</select>
            <select name="status" defaultValue={status} className={`${selectClass} max-w-[150px]`}><option value="">Semua status</option><option value="pending">Belum selesai</option><option value="done">Sudah dikoreksi</option></select>
            <button type="submit" className={btnPrimary}>Filter</button>
          </form>
        }
        bodyClassName="px-5 pb-4 pt-2"
      >
        <KoreksiTable rows={list} initialOpen={initialOpen} />
      </Card>
    </>
  );
}
