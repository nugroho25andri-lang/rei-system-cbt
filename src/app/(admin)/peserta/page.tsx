import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { deletePesertaAction, importPesertaAction, savePesertaAction } from "./actions";
import { btnDanger, btnGhost, btnPrimary, Card, inputClass, Notice, PageHeader, Stat, TableWrap, tdClass, thClass } from "@/components/ui";

type Peserta = { id: number; nip: string; nama_peserta: string; jabatan: string; batch: number; cabang: string; penempatan: string };
const messages: Record<string, string> = { added: "Peserta baru berhasil ditambahkan.", updated: "Data peserta berhasil diperbarui.", imported: "Data peserta berhasil diimpor.", deleted: "Peserta berhasil dihapus.", invalid: "Data yang dikirim belum lengkap atau tidak valid." };
const fields = ["nip", "nama_peserta", "jabatan", "batch", "cabang", "penempatan"] as const;

export default async function PesertaPage({ searchParams }: { searchParams: Promise<{ q?: string; msg?: string; count?: string }> }) {
  await requireRole(["superadmin", "admin"]);
  const { q = "", msg, count } = await searchParams;
  const like = `%${q.trim()}%`;
  const [rows, stats, batchStats, kkmRows, passRows] = await Promise.all([
    db.execute("SELECT id,nip,nama_peserta,jabatan,batch,cabang,penempatan FROM peserta WHERE nama_peserta LIKE ? OR nip LIKE ? ORDER BY id DESC", [like, like]),
    db.execute("SELECT COUNT(*) AS total FROM peserta"),
    db.execute("SELECT COUNT(DISTINCT batch) AS total FROM peserta"),
    db.execute("SELECT nilai_kkm FROM kkm LIMIT 1"),
    db.execute("SELECT COUNT(DISTINCT id_peserta) AS total FROM jawaban_peserta WHERE nilai >= COALESCE((SELECT nilai_kkm FROM kkm LIMIT 1),75)"),
  ]);
  const peserta = rows[0] as Peserta[];
  const total = Number((stats[0] as Array<{ total: number }>)[0]?.total ?? 0);
  const batches = Number((batchStats[0] as Array<{ total: number }>)[0]?.total ?? 0);
  const kkm = Number((kkmRows[0] as Array<{ nilai_kkm: number }>)[0]?.nilai_kkm ?? 75);
  const lulus = Number((passRows[0] as Array<{ total: number }>)[0]?.total ?? 0);
  return (
    <>
      <PageHeader title="Data Peserta" description="Kelola data peserta training CBT Raja Emas Indonesia." actions={<a className={btnGhost} href={`/peserta/export${q ? `?q=${encodeURIComponent(q)}` : ""}`}>Export CSV</a>} />
      {msg && messages[msg] && <Notice kind={msg === "invalid" ? "error" : "success"}>{messages[msg]}{msg === "imported" && count ? ` (${count} baris)` : ""}</Notice>}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total Peserta" value={total} />
        <Stat label="Batch" value={batches} />
        <Stat label={`Lulus (KKM ${kkm})`} value={lulus} />
      </div>

      <Card title="Tambah Peserta" className="mb-6">
        <form action={savePesertaAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((name) => (
            <label key={name} className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-rei-900/60">
              {name.replaceAll("_", " ")}
              <input className={inputClass} name={name} required={name === "nip" || name === "nama_peserta" || name === "batch"} type={name === "batch" ? "number" : "text"} />
            </label>
          ))}
          <div className="flex items-end"><button type="submit" className={btnPrimary}>Simpan Peserta</button></div>
        </form>
      </Card>

      <Card title="Import CSV" description="Format kolom: NIP, Nama, Jabatan, Batch, Cabang, Penempatan. Baris pertama dianggap header." className="mb-6">
        <form action={importPesertaAction} className="flex flex-wrap items-center gap-3">
          <input type="file" name="file_excel" accept=".csv,text/csv" required className="block w-full max-w-sm text-sm text-rei-900/70 file:mr-3 file:rounded-lg file:border-0 file:bg-rei-900 file:px-3.5 file:py-2 file:text-xs file:font-bold file:text-white" />
          <button type="submit" className={btnPrimary}>Import</button>
        </form>
      </Card>

      <Card
        title={`Daftar Peserta (${peserta.length})`}
        actions={<form action="/peserta" className="flex items-center gap-2"><input className={`${inputClass} max-w-56`} name="q" defaultValue={q} placeholder="Cari nama atau NIP" /><button type="submit" className={btnPrimary}>Cari</button></form>}
        bodyClassName="px-5 pb-4 pt-2"
      >
        <TableWrap>
          <thead className="border-b border-rei-900/10">
            <tr>{["NIP", "Nama", "Jabatan", "Batch", "Cabang", "Penempatan", "Aksi"].map((head) => <th key={head} className={thClass}>{head}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-rei-900/10">
            {peserta.map((row) => (
              <tr key={row.id} className="hover:bg-gold-200/15">
                <td className={`${tdClass} font-mono text-xs`}>{row.nip}</td>
                <td className={`${tdClass} font-semibold`}>{row.nama_peserta}</td>
                <td className={tdClass}>{row.jabatan}</td>
                <td className={tdClass}>{row.batch}</td>
                <td className={tdClass}>{row.cabang}</td>
                <td className={tdClass}>{row.penempatan}</td>
                <td className={tdClass}>
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-bold text-gold-600 hover:text-gold-500">Edit</summary>
                    <form action={savePesertaAction} className="mt-2 grid min-w-[260px] gap-2 rounded-xl border border-rei-900/10 bg-rei-100/50 p-3">
                      <input type="hidden" name="action" value="edit" />
                      <input type="hidden" name="id" value={row.id} />
                      {fields.map((key) => (
                        <label key={key} className="grid gap-1 text-[11px] font-semibold uppercase tracking-wide text-rei-900/50">
                          {key.replaceAll("_", " ")}
                          <input className={inputClass} name={key} defaultValue={String(row[key] ?? "")} required={key === "nip" || key === "nama_peserta"} />
                        </label>
                      ))}
                      <button type="submit" className={btnPrimary}>Simpan</button>
                    </form>
                  </details>
                  <form action={deletePesertaAction} className="mt-1.5">
                    <input type="hidden" name="id" value={row.id} />
                    <button className={btnDanger} type="submit">Hapus</button>
                  </form>
                </td>
              </tr>
            ))}
            {!peserta.length && <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-rei-900/50">Tidak ada peserta ditemukan.</td></tr>}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
