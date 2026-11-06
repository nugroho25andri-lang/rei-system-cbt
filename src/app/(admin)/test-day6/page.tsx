import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { saveDay6Action } from "./actions";
import { btnPrimary, Card, inputClass, Notice, PageHeader, selectClass, TableWrap, tdClass, thClass } from "@/components/ui";

export const dynamic = "force-dynamic";
type Participant = { id: number; nama_peserta: string; nip: string; batch: string };
type Score = { id: number; nama_peserta: string; nip: string; batch: string; nilai: number; catatan: string | null; nilai_akhir: number; updated_at: Date | string };
export default async function Day6Page({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  if (!await getAdminSession()) redirect("/login");
  const { saved, error } = await searchParams;
  const [participants] = await db.execute("SELECT id,nama_peserta,nip,batch FROM peserta ORDER BY nama_peserta ASC");
  const [scores] = await db.execute("SELECT d.id,d.nilai,d.catatan,d.nilai_akhir,d.updated_at,p.nama_peserta,p.nip,p.batch FROM penilaian_day6 d LEFT JOIN peserta p ON p.id=d.id_peserta ORDER BY d.updated_at DESC");
  const message = error === "participant" ? "Peserta wajib dipilih." : error === "score" ? "Nilai harus antara 0 sampai 180." : error;
  return (
    <>
      <PageHeader title="Penilaian Day 6" description="Masukkan atau perbarui nilai akhir peserta." />
      {saved && <Notice>Nilai Day 6 berhasil disimpan.</Notice>}
      {message && <Notice kind="error">{message}</Notice>}

      <Card title="Input Nilai" className="mb-6">
        <form action={saveDay6Action} className="grid max-w-2xl gap-4">
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-rei-900/60">Peserta
            <select name="id_peserta" required defaultValue="" className={selectClass}><option value="" disabled>-- Pilih Peserta --</option>{(participants as Participant[]).map((p) => <option key={p.id} value={p.id}>{p.nama_peserta} — {p.nip} | Batch {p.batch}</option>)}</select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-rei-900/60">Nilai (0–180)<input name="nilai" type="number" min="0" max="180" step="1" required className={inputClass} /></label>
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-rei-900/60">Catatan<textarea name="catatan" rows={3} maxLength={5000} className={inputClass} /></label>
          <div><button type="submit" className={btnPrimary}>Simpan Nilai</button></div>
        </form>
      </Card>

      <Card title="Nilai Tersimpan" bodyClassName="px-5 pb-4 pt-2">
        <TableWrap>
          <thead className="border-b border-rei-900/10"><tr>{["Peserta", "NIP", "Batch", "Nilai", "Nilai Akhir", "Catatan", "Diperbarui"].map((head) => <th key={head} className={thClass}>{head}</th>)}</tr></thead>
          <tbody className="divide-y divide-rei-900/10">
            {(scores as Score[]).map((row) => (
              <tr key={row.id} className="hover:bg-gold-200/15">
                <td className={`${tdClass} font-semibold`}>{row.nama_peserta}</td>
                <td className={`${tdClass} font-mono text-xs`}>{row.nip}</td>
                <td className={tdClass}>{row.batch}</td>
                <td className={tdClass}>{row.nilai}</td>
                <td className={`${tdClass} font-bold`}>{row.nilai_akhir}</td>
                <td className={`${tdClass} max-w-[260px] text-xs text-rei-900/60`}>{row.catatan}</td>
                <td className={`${tdClass} whitespace-nowrap text-xs`}>{new Date(row.updated_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</td>
              </tr>
            ))}
            {!(scores as Score[]).length && <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-rei-900/50">Belum ada nilai Day 6.</td></tr>}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
