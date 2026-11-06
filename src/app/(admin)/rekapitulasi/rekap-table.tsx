"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, inputCompact, Notice, TableWrap, tdClass, thClass } from "@/components/ui";
export type RekapRow = { id: number; nip: string; nama_peserta: string; jabatan: string; batch: string; cabang: string; tes1: number; tes2: number; tes3: number; tes4: number; tes5: number; tes6: number; nilai_aadl: number; total_nilai: number };
const fields = ["tes1", "tes2", "tes3", "tes4", "tes5", "tes6", "nilai_aadl"] as const;
export default function RekapTable({ rows }: { rows: RekapRow[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<number, RekapRow>>(() => Object.fromEntries(rows.map((row) => [row.id, row])));
  const [saving, setSaving] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  async function save(row: RekapRow) {
    setSaving(row.id); setNotice(null);
    try {
      const payload = { id_peserta: row.id, ...Object.fromEntries(fields.map((field) => [field, Number(values[row.id]?.[field] ?? 0)])) };
      const response = await fetch("/api/rekap/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { success?: boolean; message?: string };
      if (!response.ok || !data.success) throw new Error(data.message ?? "Gagal menyimpan nilai.");
      setNotice({ kind: "success", text: data.message ?? "Nilai berhasil disimpan." });
      router.refresh();
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Gagal menyimpan nilai." });
    } finally {
      setSaving(null);
    }
  }
  return (
    <>
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      <TableWrap>
        <thead className="border-b border-rei-900/10">
          <tr><th className={thClass}>Peserta</th><th className={thClass}>NIP</th><th className={thClass}>Batch</th>{fields.map((field) => <th key={field} className={thClass}>{field.toUpperCase().replace("NILAI_", "")}</th>)}<th className={thClass}>Total</th><th className={thClass}>Aksi</th></tr>
        </thead>
        <tbody className="divide-y divide-rei-900/10">
          {rows.map((row) => {
            const current = values[row.id] ?? row;
            const total = fields.reduce((sum, field) => sum + (Number(current[field]) || 0), 0);
            return (
              <tr key={row.id} className="hover:bg-gold-200/15">
                <td className={`${tdClass} font-semibold`}>{row.nama_peserta}</td>
                <td className={`${tdClass} font-mono text-xs`}>{row.nip}</td>
                <td className={tdClass}>{row.batch}</td>
                {fields.map((field) => (
                  <td key={field} className="px-2 py-2">
                    <input aria-label={`${row.nama_peserta} ${field}`} className={`${inputCompact} w-[78px] text-right`} type="number" min="0" max="1000" step="0.01" value={current[field] ?? 0} onChange={(event) => setValues((state) => ({ ...state, [row.id]: { ...current, [field]: Number(event.target.value) } }))} />
                  </td>
                ))}
                <td className={`${tdClass} font-bold`}>{total.toLocaleString("id-ID")}</td>
                <td className={tdClass}><button className={`${btnPrimary} px-3 py-1.5 text-xs`} disabled={saving === row.id} onClick={() => void save(row)}>{saving === row.id ? "Menyimpan…" : "Simpan"}</button></td>
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={12} className="px-3 py-10 text-center text-sm text-rei-900/50">Tidak ada peserta untuk filter ini.</td></tr>}
        </tbody>
      </TableWrap>
    </>
  );
}
