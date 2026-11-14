"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, inputCompact, Notice, TableWrap, tdClass, thClass } from "@/components/ui";
export type RekapRow = { id: number; nip: string; nama_peserta: string; jabatan: string; batch: string; cabang: string; pretest1: number; pretest2: number; pretest3: number; pretest4: number; tes1: number; tes2: number; tes3: number; tes4: number; tes5: number; tes6: number; nilai_aadl: number; total_nilai: number };
const fields = ["tes1", "tes2", "tes3", "tes4", "tes5", "tes6", "nilai_aadl"] as const;
const dayFields = [
  { day: "Day 1", pretest: "pretest1", posttest: "tes1" },
  { day: "Day 2", pretest: "pretest2", posttest: "tes2" },
  { day: "Day 3", pretest: "pretest3", posttest: "tes3" },
  { day: "Day 4", pretest: "pretest4", posttest: "tes4" },
] as const;
const labels: Record<(typeof fields)[number], string> = { tes1: "Posttest Day 1", tes2: "Posttest Day 2", tes3: "Posttest Day 3", tes4: "Posttest Day 4", tes5: "Day 5", tes6: "Day 6", nilai_aadl: "AADL" };
export default function RekapTable({ rows, kkm }: { rows: RekapRow[]; kkm: number }) {
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
        <thead className="border-b border-rei-900/10 bg-rei-900/[0.03]">
          <tr>
            <th className={thClass} rowSpan={2}>Peserta</th>
            <th className={thClass} rowSpan={2}>NIP</th>
            <th className={thClass} rowSpan={2}>Batch</th>
            {dayFields.map(({ day }) => <th key={day} className={thClass} colSpan={2}>{day}</th>)}
            {fields.slice(4).map((field) => <th key={field} className={thClass} rowSpan={2}>{labels[field]}</th>)}
            <th className={thClass} rowSpan={2}>Total</th>
            <th className={thClass} rowSpan={2}>Status</th>
            <th className={thClass} rowSpan={2}>Aksi</th>
          </tr>
          <tr>{dayFields.flatMap(({ day }) => [
            <th key={`${day}-pretest`} className={thClass}>Pretest</th>,
            <th key={`${day}-posttest`} className={thClass}>Posttest</th>,
          ])}</tr>
        </thead>
        <tbody className="divide-y divide-rei-900/10">
          {rows.map((row) => {
            const current = values[row.id] ?? row;
            const total = fields.reduce((sum, field) => sum + (Number(current[field]) || 0), 0);
            const passed = total >= kkm;
            return (
              <tr key={row.id} className="transition-colors odd:bg-white even:bg-rei-900/[0.02] hover:bg-gold-200/20">
                <td className={`${tdClass} min-w-[180px] font-semibold`}>{row.nama_peserta}</td>
                <td className={`${tdClass} font-mono text-xs`}>{row.nip}</td>
                <td className={tdClass}>{row.batch}</td>
                {dayFields.flatMap(({ day, pretest, posttest }) => [
                  <td key={`${day}-pretest`} className={`${tdClass} font-semibold text-sky-700`}>{Number(row[pretest] ?? 0).toLocaleString("id-ID")}</td>,
                  <td key={`${day}-posttest`} className="px-2 py-2">
                    <input aria-label={`${row.nama_peserta} ${labels[posttest]}`} className={`${inputCompact} w-[78px] text-right`} type="number" min="0" max="1000" step="0.01" value={current[posttest] ?? 0} onChange={(event) => setValues((state) => ({ ...state, [row.id]: { ...current, [posttest]: Number(event.target.value) } }))} />
                  </td>,
                ])}
                {fields.slice(4).map((field) => (
                  <td key={field} className="px-2 py-2">
                    <input aria-label={`${row.nama_peserta} ${labels[field]}`} className={`${inputCompact} w-[78px] text-right`} type="number" min="0" max="1000" step="0.01" value={current[field] ?? 0} onChange={(event) => setValues((state) => ({ ...state, [row.id]: { ...current, [field]: Number(event.target.value) } }))} />
                  </td>
                ))}
                <td className={`${tdClass} whitespace-nowrap text-right font-extrabold tabular-nums`}>{total.toLocaleString("id-ID")}</td>
                <td className={tdClass}>
                  <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${passed ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}>
                    {passed ? "Lulus" : "Tidak Lulus"}
                  </span>
                </td>
                <td className={tdClass}><button className={`${btnPrimary} px-3 py-1.5 text-xs`} disabled={saving === row.id} onClick={() => void save(row)}>{saving === row.id ? "Menyimpan…" : "Simpan"}</button></td>
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={17} className="px-3 py-10 text-center text-sm text-rei-900/50">Tidak ada peserta untuk filter ini.</td></tr>}
        </tbody>
      </TableWrap>
    </>
  );
}
