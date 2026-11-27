"use client";

import { useState } from "react";
import {
  normalizeTableConfig,
  PEMBUKUAN_TABLE_PRESET,
  SIMPLE_TABLE_PRESET,
  type TableColumn,
  type TableColumnType,
  type TableConfig,
} from "@/lib/table-question";
import TableAnswerGrid from "./table-answer-grid";
import { btnDanger, btnGhost, inputClass, selectClass } from "./ui";

type TableBuilderProps = {
  initialConfig?: TableConfig | string | null;
  onChange?: (configJson: string) => void;
  name?: string;
  compact?: boolean;
};

function makeColumn(index: number): TableColumn {
  return {
    id: `col_${Date.now()}_${index}`,
    group: "",
    label: `Kolom ${index}`,
    type: "text",
    placeholder: "",
  };
}

export default function TableBuilder({
  initialConfig,
  onChange,
  name = "tabel_config",
  compact = false,
}: TableBuilderProps) {
  const [config, setConfig] = useState<TableConfig>(() => {
    return normalizeTableConfig(initialConfig) ?? SIMPLE_TABLE_PRESET;
  });

  function commit(next: TableConfig) {
    setConfig(next);
    if (onChange) onChange(JSON.stringify(next));
  }

  function applyPreset(preset: TableConfig) {
    commit({
      ...preset,
      columns: preset.columns.map((col, idx) => ({ ...col, id: `col_${idx + 1}` })),
    });
  }

  function updateColumn(index: number, patch: Partial<TableColumn>) {
    const nextCols = config.columns.map((col, idx) => (idx === index ? { ...col, ...patch } : col));
    commit({ ...config, columns: nextCols });
  }

  function addColumn() {
    commit({
      ...config,
      columns: [...config.columns, makeColumn(config.columns.length + 1)],
    });
  }

  function removeColumn(index: number) {
    if (config.columns.length <= 1) return;
    commit({
      ...config,
      columns: config.columns.filter((_, idx) => idx !== index),
    });
  }

  function moveColumn(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= config.columns.length) return;
    const nextCols = [...config.columns];
    [nextCols[index], nextCols[target]] = [nextCols[target], nextCols[index]];
    commit({ ...config, columns: nextCols });
  }

  const serialized = JSON.stringify(config);

  return (
    <div className="space-y-4 rounded-xl border border-rei-900/15 bg-[#faf8fa] p-4">
      {name && <input type="hidden" name={name} value={serialized} />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-rei-900/75">Desain Tabel Jawaban (Seperti Excel)</p>
          <p className="mt-0.5 text-[11px] text-rei-900/50">
            Atur kolom, grup header (opsional), dan jumlah baris. Peserta akan langsung mengisi sel tabel ini saat ujian.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset(PEMBUKUAN_TABLE_PRESET)}
            className="rounded-lg border border-gold-500/40 bg-gold-200/60 px-3 py-1.5 text-xs font-bold text-rei-900 transition hover:bg-gold-300/60"
          >
            Template Pembukuan (Test 4)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(SIMPLE_TABLE_PRESET)}
            className={btnGhost}
          >
            Tabel Standar (3 Kolom)
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wide text-rei-900/60">
          Jumlah baris awal
          <input
            type="number"
            min={1}
            max={30}
            value={config.defaultRows}
            onChange={(event) => {
              const val = Math.min(Math.max(Math.trunc(Number(event.target.value) || 1), 1), 30);
              commit({ ...config, defaultRows: val });
            }}
            className={inputClass}
          />
        </label>

        <div className="flex items-end sm:col-span-2">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-rei-900/10 bg-white px-3.5 py-2.5 text-xs font-semibold text-rei-900">
            <input
              type="checkbox"
              checked={config.allowAddRow}
              onChange={(event) => commit({ ...config, allowAddRow: event.target.checked })}
              className="h-4 w-4 accent-rei-900"
            />
            Izinkan peserta menambah / menghapus baris saat ujian
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-rei-900/60">
            Daftar Kolom ({config.columns.length})
          </p>
          <button type="button" onClick={addColumn} className={btnGhost}>
            + Tambah Kolom
          </button>
        </div>

        <div className="space-y-2">
          {config.columns.map((col, idx) => (
            <div
              key={`${col.id}-${idx}`}
              className="grid items-end gap-2 rounded-lg border border-rei-900/10 bg-white p-2.5 sm:grid-cols-[1fr_1fr_120px_1fr_auto]"
            >
              <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-rei-900/50">
                Grup Header (Opsional)
                <input
                  type="text"
                  value={col.group ?? ""}
                  placeholder="Mis. Pemasukan (Debit)"
                  onChange={(event) => updateColumn(idx, { group: event.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-rei-900/50">
                Nama Kolom *
                <input
                  type="text"
                  value={col.label}
                  placeholder={`Kolom ${idx + 1}`}
                  onChange={(event) => updateColumn(idx, { label: event.target.value })}
                  className={inputClass}
                  required
                />
              </label>
              <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-rei-900/50">
                Tipe Data
                <select
                  value={col.type ?? "text"}
                  onChange={(event) => updateColumn(idx, { type: event.target.value as TableColumnType })}
                  className={selectClass}
                >
                  <option value="text">Teks</option>
                  <option value="number">Angka</option>
                  <option value="currency">Nominal</option>
                </select>
              </label>
              <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-rei-900/50">
                Contoh / Placeholder
                <input
                  type="text"
                  value={col.placeholder ?? ""}
                  placeholder="Opsional"
                  onChange={(event) => updateColumn(idx, { placeholder: event.target.value })}
                  className={inputClass}
                />
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveColumn(idx, -1)}
                  disabled={idx === 0}
                  title="Geser kiri/atas"
                  className="rounded-lg border border-rei-900/10 px-2 py-2 text-xs font-bold text-rei-900/60 hover:bg-rei-900/5 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveColumn(idx, 1)}
                  disabled={idx === config.columns.length - 1}
                  title="Geser kanan/bawah"
                  className="rounded-lg border border-rei-900/10 px-2 py-2 text-xs font-bold text-rei-900/60 hover:bg-rei-900/5 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeColumn(idx)}
                  disabled={config.columns.length <= 1}
                  className={`${btnDanger} px-2.5 py-2 disabled:opacity-30`}
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!compact && (
        <div className="space-y-1.5 border-t border-rei-900/10 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-rei-900/60">
            Pratinjau Tabel di Layar Peserta
          </p>
          <TableAnswerGrid config={config} editable={false} compact />
        </div>
      )}
    </div>
  );
}
