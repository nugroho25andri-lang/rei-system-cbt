"use client";

import { useEffect, useState } from "react";
import { deleteSoalAction, updateSoalAction } from "./actions";
import { btnDanger, btnGhost, btnPrimary, inputClass, selectClass, TableWrap, tdClass, thClass } from "@/components/ui";

export type Question = {
  id: number;
  day: string;
  no_soal: number;
  pertanyaan: string;
  kata_kunci: string;
  bobot: number;
  waktu_soal: number;
  jenis_soal: "esai" | "pilihan_ganda";
  pilihan_a: string | null;
  pilihan_b: string | null;
  pilihan_c: string | null;
  pilihan_d: string | null;
  jawaban_benar: string | null;
};

const label = "grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-rei-900/60";
const LETTERS = ["A", "B", "C", "D"] as const;

function EditModal({ question, days, onClose }: { question: Question; days: string[]; onClose: () => void }) {
  const [jenis, setJenis] = useState<"esai" | "pilihan_ganda">(question.jenis_soal);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-rei-900/55 p-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="edit-soal-title" className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-rei-900/10 px-5 py-4">
          <div>
            <h2 id="edit-soal-title" className="text-[15px] font-bold text-rei-900">Edit Soal #{question.id}</h2>
            <p className="mt-0.5 text-xs text-rei-900/50">{question.day} · nomor {question.no_soal}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-rei-900/10 px-2.5 py-1 text-sm font-bold text-rei-900/60 transition hover:bg-rei-900/5" aria-label="Tutup">✕</button>
        </div>

        <form action={updateSoalAction} className="grid gap-4 p-5 sm:grid-cols-2">
          <input name="id" type="hidden" value={question.id} />
          <label className={label}>Day<select name="day" defaultValue={question.day} className={selectClass}>{days.map((day) => <option key={day}>{day}</option>)}</select></label>
          <label className={label}>Nomor soal<input className={inputClass} name="no_soal" type="number" min="1" defaultValue={question.no_soal} required /></label>
          <label className={label}>Jenis soal<select name="jenis_soal" className={selectClass} value={jenis} onChange={(event) => setJenis(event.target.value as "esai" | "pilihan_ganda")}><option value="esai">Esai</option><option value="pilihan_ganda">Pilihan ganda</option></select></label>
          <label className={label}>Bobot<input className={inputClass} name="bobot" type="number" min="1" defaultValue={question.bobot} required /></label>
          <label className={label}>Waktu soal (detik)<input className={inputClass} name="waktu_soal" type="number" min="0" max="86400" defaultValue={question.waktu_soal} required /></label>
          <label className={`${label} sm:col-span-2`}>Pertanyaan<textarea className={inputClass} name="pertanyaan" rows={3} defaultValue={question.pertanyaan} required /></label>

          {jenis === "pilihan_ganda" ? (
            <>
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                {LETTERS.map((letter, index) => (
                  <label key={letter} className={label}>Pilihan {letter}<input className={inputClass} name={`pilihan_${letter.toLowerCase()}`} defaultValue={[question.pilihan_a, question.pilihan_b, question.pilihan_c, question.pilihan_d][index] ?? ""} required /></label>
                ))}
              </div>
              <label className={label}>Kunci jawaban<select name="jawaban_benar" className={selectClass} defaultValue={question.jawaban_benar ?? "A"}>{LETTERS.map((letter) => <option key={letter} value={letter}>{letter}</option>)}</select></label>
            </>
          ) : (
            <label className={`${label} sm:col-span-2`}>Kata kunci<input className={inputClass} name="kata_kunci" defaultValue={question.kata_kunci} placeholder="Pisahkan dengan koma" /></label>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-rei-900/10 pt-4 sm:col-span-2">
            <button type="button" onClick={onClose} className={btnGhost}>Batal</button>
            <button type="submit" className={btnPrimary}>Simpan Perubahan</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function QuestionManager({ questions, days }: { questions: Question[]; days: string[] }) {
  const [editing, setEditing] = useState<Question | null>(null);

  return (
    <>
      <TableWrap>
        <thead className="border-b border-rei-900/10">
          <tr>{["Day", "No", "Jenis", "Pertanyaan", "Kunci / Kata kunci", "Bobot", "Waktu", "Aksi"].map((head) => <th key={head} className={thClass}>{head}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-rei-900/10">
          {questions.map((row) => (
            <tr key={row.id} className="hover:bg-gold-200/15">
              <td className={`${tdClass} whitespace-nowrap font-semibold`}>{row.day}</td>
              <td className={tdClass}>{row.no_soal}</td>
              <td className={tdClass}><span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${row.jenis_soal === "pilihan_ganda" ? "bg-gold-200 text-gold-600" : "bg-rei-100 text-rei-900/70"}`}>{row.jenis_soal === "pilihan_ganda" ? "Pilihan ganda" : "Esai"}</span></td>
              <td className={`${tdClass} max-w-[420px]`}>
                {row.pertanyaan}
                {row.jenis_soal === "pilihan_ganda" && (
                  <details className="mt-1.5 text-xs">
                    <summary className="cursor-pointer font-semibold text-gold-600">Lihat pilihan</summary>
                    <ol type="A" className="mt-1.5 space-y-1 pl-5 text-rei-900/70">
                      {[row.pilihan_a, row.pilihan_b, row.pilihan_c, row.pilihan_d].map((choice, index) => (
                        <li key={index} className={row.jawaban_benar === "ABCD"[index] ? "font-bold text-emerald-700" : undefined}>{choice}{row.jawaban_benar === "ABCD"[index] && " ✓"}</li>
                      ))}
                    </ol>
                  </details>
                )}
              </td>
              <td className={`${tdClass} max-w-[220px] text-xs text-rei-900/60`}>{row.jenis_soal === "pilihan_ganda" ? row.jawaban_benar : row.kata_kunci}</td>
              <td className={tdClass}>{row.bobot}</td>
              <td className={`${tdClass} whitespace-nowrap`}>{row.waktu_soal > 0 ? `${row.waktu_soal} dtk` : "∞"}</td>
              <td className={tdClass}>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditing(row)} className={btnGhost}>Edit</button>
                  <form action={deleteSoalAction} onSubmit={(event) => { if (!window.confirm("Hapus soal ini?")) event.preventDefault(); }}>
                    <input name="id" type="hidden" value={row.id} />
                    <button className={btnDanger} type="submit">Hapus</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {!questions.length && <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-rei-900/50">Tidak ada soal ditemukan.</td></tr>}
        </tbody>
      </TableWrap>

      {editing && <EditModal question={editing} days={days} onClose={() => setEditing(null)} />}
    </>
  );
}
