"use client";

import { btnDanger, btnGhost, inputCompact } from "@/components/ui";

export type KeywordDraft = { kata_kunci: string; bobot: string };

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export default function KeywordEditor({ rows, onChange, bobot }: { rows: KeywordDraft[]; onChange: (rows: KeywordDraft[]) => void; bobot: number }) {
  const total = round2(rows.reduce((sum, row) => sum + (Number(row.bobot) || 0), 0));
  const over = bobot > 0 && total > bobot + 0.001;

  function update(index: number, patch: Partial<KeywordDraft>) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function distribute() {
    if (!rows.length || bobot <= 0) return;
    const weight = round2(bobot / rows.length);
    onChange(rows.map((row) => ({ ...row, bobot: String(weight) })));
  }

  return (
    <div className="rounded-xl border border-rei-900/10 bg-[#faf8fa] p-3.5 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rei-900/60">Kata kunci &amp; bobot</p>
          <p className="mt-0.5 text-[11px] text-rei-900/45">Jawaban esai dinilai otomatis bila kata kunci muncul. Bobot tiap kata kunci menentukan nilai.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${over ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
            Total {total} / {bobot}
          </span>
          {rows.length > 0 && <button type="button" onClick={distribute} className={btnGhost}>Bagi rata</button>}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mt-3 space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_92px_auto] items-center gap-2">
              <input
                className={inputCompact}
                name="kata_kunci[]"
                value={row.kata_kunci}
                onChange={(event) => update(index, { kata_kunci: event.target.value })}
                placeholder={`Kata kunci ${index + 1}`}
              />
              <input
                className={inputCompact}
                name="bobot_kata_kunci[]"
                type="number"
                min="0.01"
                step="0.01"
                value={row.bobot}
                onChange={(event) => update(index, { bobot: event.target.value })}
                placeholder="Bobot"
                aria-label={`Bobot kata kunci ${index + 1}`}
              />
              <button type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} className={btnDanger} aria-label="Hapus kata kunci">Hapus</button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={() => onChange([...rows, { kata_kunci: "", bobot: "1" }])} className={btnGhost}>+ Tambah kata kunci</button>
        {over && <span className="text-[11px] font-semibold text-rose-700">Total bobot melebihi bobot soal.</span>}
      </div>
    </div>
  );
}
