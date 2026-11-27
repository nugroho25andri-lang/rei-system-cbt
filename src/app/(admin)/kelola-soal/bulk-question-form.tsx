"use client";

import { useActionState, useState } from "react";
import { addManySoalAction, type BulkState } from "./actions";
import TableBuilder from "@/components/table-builder";
import { btnDanger, btnGhost, btnPrimary, inputClass, Notice, selectClass } from "@/components/ui";
import { isQuestionDay } from "@/lib/exam-days";
import { SIMPLE_TABLE_PRESET } from "@/lib/table-question";

type Draft = {
  key: number;
  day: string;
  jenis_tes: "pretest" | "posttest";
  no_soal: string;
  jenis_soal: "esai" | "pilihan_ganda" | "tabel";
  bobot: string;
  waktu_soal: string;
  pertanyaan: string;
  kata_kunci: string;
  pilihan_a: string;
  pilihan_b: string;
  pilihan_c: string;
  pilihan_d: string;
  jawaban_benar: string;
  tabel_config: string;
};

const label = "grid gap-1 text-[11px] font-semibold uppercase tracking-wide text-rei-900/55";
const LETTERS = ["A", "B", "C", "D"] as const;
let nextKey = 1;

function newRow(day: string, noSoal: number): Draft {
  return {
    key: nextKey++,
    day,
    jenis_tes: "posttest",
    no_soal: String(noSoal),
    jenis_soal: "esai",
    bobot: "1",
    waktu_soal: "0",
    pertanyaan: "",
    kata_kunci: "",
    pilihan_a: "",
    pilihan_b: "",
    pilihan_c: "",
    pilihan_d: "",
    jawaban_benar: "A",
    tabel_config: JSON.stringify(SIMPLE_TABLE_PRESET),
  };
}

export default function BulkQuestionForm({ days, nextNumbers }: { days: string[]; nextNumbers: Record<string, number> }) {
  const firstDay = days[0] ?? "Day 1";
  const [rows, setRows] = useState<Draft[]>([newRow(firstDay, nextNumbers[firstDay] ?? 1)]);
  const [state, formAction, pending] = useActionState<BulkState, FormData>(addManySoalAction, null);

  function nextNoFor(list: Draft[], day: string) {
    const base = nextNumbers[day] ?? 0;
    const used = list.filter((row) => row.day === day).map((row) => Number(row.no_soal) || 0);
    return Math.max(base, ...used) + 1;
  }

  function update(key: number, field: keyof Draft, value: string) {
    setRows((current) => current.map((row) => (row.key === key ? ({ ...row, [field]: value } as Draft) : row)));
  }

  function addRow() {
    setRows((current) => {
      const day = current[0]?.day ?? firstDay;
      return [...current, newRow(day, nextNoFor(current, day))];
    });
  }

  function duplicateRow(source: Draft) {
    setRows((current) => [...current, { ...source, key: nextKey++, no_soal: String(nextNoFor(current, source.day)) }]);
  }

  function removeRow(key: number) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));
  }

  const payload = JSON.stringify(rows.map(({ key, ...row }) => row));
  const questionCount = rows.length;
  const hasUnsupportedDay = rows.some((row) => !isQuestionDay(row.day));

  return (
    <form action={formAction} className="grid gap-4">
      <input name="payload" type="hidden" value={payload} />
      {state && !state.ok && <Notice kind="error">{state.message}</Notice>}

      <div className="grid gap-3">
        {rows.map((row, index) => (
          <div key={row.key} className="rounded-xl border border-rei-900/10 bg-[#faf8fa] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-rei-900/60">Soal #{index + 1}</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => duplicateRow(row)} className={btnGhost}>Duplikat</button>
                <button type="button" onClick={() => removeRow(row.key)} disabled={rows.length === 1} className={`${btnDanger} disabled:cursor-not-allowed disabled:opacity-40`}>Hapus</button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className={label}>Day
                <select className={selectClass} value={row.day} onChange={(event) => { const day = event.target.value; update(row.key, "day", day); update(row.key, "no_soal", String(nextNoFor(rows, day))); }}>
                  {days.map((day) => <option key={day}>{day}</option>)}
                </select>
              </label>
              {isQuestionDay(row.day)
                ? <label className={label}>Jenis tes
                    <select className={selectClass} value={row.jenis_tes} onChange={(event) => update(row.key, "jenis_tes", event.target.value)}>
                      <option value="pretest">Pretest</option>
                      <option value="posttest">Posttest</option>
                    </select>
                  </label>
                : <div className="self-end rounded-lg border border-gold-500/30 bg-gold-200/40 px-3 py-2 text-[11px] leading-relaxed text-rei-900/65">Day 5 menggunakan penilaian praktik, bukan soal pretest/posttest.</div>}
              <label className={label}>Nomor soal<input className={inputClass} type="number" min="1" value={row.no_soal} onChange={(event) => update(row.key, "no_soal", event.target.value)} required /></label>
              <label className={label}>Jenis soal
                <select className={selectClass} value={row.jenis_soal} onChange={(event) => update(row.key, "jenis_soal", event.target.value)}>
                  <option value="esai">Esai</option>
                  <option value="tabel">Tabel / Kolom (Excel)</option>
                  <option value="pilihan_ganda">Pilihan ganda</option>
                </select>
              </label>
              <label className={label}>Bobot<input className={inputClass} type="number" min="1" value={row.bobot} onChange={(event) => update(row.key, "bobot", event.target.value)} required /></label>
              <label className={label} title="0 = tanpa batas waktu">Waktu (detik)<input className={inputClass} type="number" min="0" max="86400" value={row.waktu_soal} onChange={(event) => update(row.key, "waktu_soal", event.target.value)} required /></label>
              <label className={`${label} sm:col-span-2 lg:col-span-5`}>Pertanyaan
                <textarea className={inputClass} rows={2} value={row.pertanyaan} onChange={(event) => update(row.key, "pertanyaan", event.target.value)} required />
              </label>

              {row.jenis_soal === "pilihan_ganda" ? (
                <>
                  <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-4">
                    {LETTERS.map((letter) => {
                      const field = `pilihan_${letter.toLowerCase()}` as keyof Draft;
                      return (
                        <label key={letter} className={label}>Pilihan {letter}
                          <input className={inputClass} value={row[field] as string} onChange={(event) => update(row.key, field, event.target.value)} required />
                        </label>
                      );
                    })}
                  </div>
                  <label className={label}>Kunci jawaban
                    <select className={selectClass} value={row.jawaban_benar} onChange={(event) => update(row.key, "jawaban_benar", event.target.value)}>
                      {LETTERS.map((letter) => <option key={letter} value={letter}>{letter}</option>)}
                    </select>
                  </label>
                </>
              ) : row.jenis_soal === "tabel" ? (
                <div className="sm:col-span-2 lg:col-span-5">
                  <TableBuilder
                    name=""
                    compact
                    initialConfig={row.tabel_config}
                    onChange={(json) => update(row.key, "tabel_config", json)}
                  />
                </div>
              ) : (
                <label className={`${label} sm:col-span-2 lg:col-span-5`}>Kata kunci
                  <input className={inputClass} value={row.kata_kunci} onChange={(event) => update(row.key, "kata_kunci", event.target.value)} placeholder="Pisahkan dengan koma, mis. materai:3, nota:2, tanggal. Tanpa bobot = dibagi rata." />
                </label>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rei-900/10 pt-4">
        {hasUnsupportedDay && <Notice kind="error">Soal pretest/posttest hanya tersedia untuk Day 1 sampai Day 4. Hapus baris Day 5 atau pilih hari lain.</Notice>}
        <button type="button" onClick={addRow} className={btnGhost}>+ Tambah Baris</button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-rei-900/50">{questionCount} soal siap disimpan</span>
          <button type="submit" className={btnPrimary} disabled={pending || hasUnsupportedDay}>{pending ? "Menyimpan..." : `Simpan ${questionCount} Soal`}</button>
        </div>
      </div>
    </form>
  );
}
