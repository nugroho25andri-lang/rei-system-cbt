"use client";
import { useMemo, useState } from "react";
import { saveAADLAction } from "./actions";
import { btnPrimary, Card, inputClass, Notice, PageHeader, selectClass } from "@/components/ui";
type Participant = { id: number; nama_peserta: string; nip: string; batch: string };
const categories = [
  { code: "A", title: "ATTITUDE (SIKAP)", items: ["Sopan santun saat training", "Sikap terhadap trainer & peserta lain", "Kemampuan menerima feedback", "Tanggung jawab selama training", "Cara Komunikasi"] },
  { code: "B", title: "ANTUSIASME", items: ["Semangat mengikuti training", "Keaktifan bertanya/berdiskusi", "Inisiatif dalam praktik", "Motivasi belajar", "Respons Terhadap Trainer"] },
  { code: "C", title: "DISIPLIN", items: ["Kehadiran tepat waktu", "Kepatuhan terhadap aturan training", "Menyelesaikan tugas tepat waktu", "Konsistensi selama training", "Kerapihan dan Kesiapan"] },
  { code: "D", title: "LOYALITAS", items: ["Komitmen terhadap perusahaan", "Menjaga nama baik perusahaan", "Kerja sama tim", "Kesediaan berkontribusi setelah training", "Kepatuhan Terhadap Nilai & Budaya"] },
];
export default function AADLForm({ participants, batch, saved, error }: { participants: Participant[]; batch: string; saved: boolean; error?: string }) {
  const [participantId, setParticipantId] = useState("");
  const [scores, setScores] = useState<Record<string, number>>(() => Object.fromEntries(categories.flatMap((category) => category.items.map((_, index) => [`${category.code}-${index}`, 5]))));
  const total = useMemo(() => Object.values(scores).reduce((sum, value) => sum + value, 0), [scores]);
  return (
    <>
      <PageHeader title="Input Nilai AADL" description="Penilaian trainer · filter batch lalu pilih peserta." />
      {saved && <Notice>Nilai berhasil disimpan.</Notice>}
      {error && <Notice kind="error">{error === "participant" ? "Pilih peserta terlebih dahulu." : error === "score" ? "Isi 20 nilai dengan angka 1 sampai 5." : decodeURIComponent(error)}</Notice>}

      <Card className="mb-6">
        <form action="/input-nilai" className="flex flex-wrap items-end gap-3">
          <select name="batch" defaultValue={batch} className={`${selectClass} max-w-[220px]`}><option value="">Semua Batch</option>{Array.from(new Set(participants.map((participant) => participant.batch).filter(Boolean))).sort().map((option) => <option key={option}>{option}</option>)}</select>
          <button type="submit" className={btnPrimary}>Filter</button>
        </form>
      </Card>

      <form action={saveAADLAction}>
        <Card title="Pilih Peserta" className="mb-6">
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-rei-900/60">Peserta
            <select name="id_peserta" required value={participantId} onChange={(event) => setParticipantId(event.target.value)} className={`${selectClass} max-w-lg`}>
              <option value="">-- Pilih Peserta --</option>
              {participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.nama_peserta} — {participant.nip} {participant.batch ? `| Batch ${participant.batch}` : ""}</option>)}
            </select>
          </label>
          {participants.length === 0 && <p className="mt-3 text-sm text-rei-900/50">Tidak ada peserta untuk filter ini.</p>}
        </Card>

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {categories.map((category) => {
            const categoryTotal = category.items.reduce((sum, _, index) => sum + scores[`${category.code}-${index}`], 0);
            return (
              <Card key={category.code} title={`${category.code}. ${category.title}`} actions={<span className="rounded-full bg-gold-200 px-2.5 py-0.5 text-xs font-bold text-gold-600">Total {categoryTotal}</span>}>
                <div className="space-y-2">
                  {category.items.map((item, index) => (
                    <label className="flex items-center justify-between gap-3 border-b border-rei-900/8 pb-2 last:border-0 last:pb-0" key={item}>
                      <span className="text-sm text-rei-900/75">{index + 1}. {item}</span>
                      <span className="w-20 shrink-0">
                        <select name={`n_${category.code}[]`} value={scores[`${category.code}-${index}`]} onChange={(event) => setScores((current) => ({ ...current, [`${category.code}-${index}`]: Number(event.target.value) }))} className={`${selectClass} px-2 py-1.5 text-center`}>
                          {[1,2,3,4,5].map((score) => <option key={score} value={score}>{score}</option>)}
                        </select>
                      </span>
                    </label>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        <Card title="Catatan & Simpan" actions={<span className="text-lg font-extrabold text-rei-900">Grand Total: {total.toFixed(2)}</span>}>
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-rei-900/60">Catatan
            <textarea name="catatan" rows={3} maxLength={5000} className={inputClass} />
          </label>
          <input type="hidden" name="grand_total" value={total.toFixed(2)} />
          <div className="mt-4"><button type="submit" disabled={!participantId} className={btnPrimary}>Simpan Penilaian</button></div>
        </Card>
      </form>
    </>
  );
}
