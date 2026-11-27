"use client";

import { useMemo, useRef } from "react";
import {
  buildHeaderGroups,
  createInitialTableRows,
  hasGroupedHeaders,
  parseTableAnswer,
  serializeTableAnswer,
  type TableConfig,
} from "@/lib/table-question";

type TableAnswerGridProps = {
  config: TableConfig;
  value?: string | null;
  onChange?: (serialized: string) => void;
  editable?: boolean;
  compact?: boolean;
};

export default function TableAnswerGrid({
  config,
  value,
  onChange,
  editable = false,
  compact = false,
}: TableAnswerGridProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const colCount = config.columns.length;
  const grouped = useMemo(() => hasGroupedHeaders(config.columns), [config.columns]);
  const headerGroups = useMemo(() => (grouped ? buildHeaderGroups(config.columns) : []), [grouped, config.columns]);

  const rows = useMemo(() => {
    const parsed = parseTableAnswer(value, colCount);
    if (parsed && parsed.length > 0) return parsed;
    return createInitialTableRows(config);
  }, [value, colCount, config]);

  function updateCell(rowIndex: number, colIndex: number, nextValue: string) {
    if (!editable || !onChange) return;
    const nextRows = rows.map((row, rIdx) =>
      rIdx === rowIndex ? row.map((cell, cIdx) => (cIdx === colIndex ? nextValue : cell)) : [...row],
    );
    onChange(serializeTableAnswer(nextRows));
  }

  function addRow() {
    if (!editable || !onChange) return;
    const emptyRow = config.columns.map(() => "");
    onChange(serializeTableAnswer([...rows, emptyRow]));
  }

  function removeRow(rowIndex: number) {
    if (!editable || !onChange || rows.length <= 1) return;
    const nextRows = rows.filter((_, idx) => idx !== rowIndex);
    onChange(serializeTableAnswer(nextRows));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) {
    if (!editable) return;
    let nextRow = rowIndex;
    let nextCol = colIndex;
    if (event.key === "ArrowDown" || event.key === "Enter") {
      event.preventDefault();
      nextRow = Math.min(rowIndex + 1, rows.length - 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      nextRow = Math.max(rowIndex - 1, 0);
    } else {
      return;
    }
    const target = inputRefs.current[`${nextRow}-${nextCol}`];
    if (target) {
      target.focus();
      target.select();
    }
  }

  const filledCells = rows.reduce(
    (sum, row) => sum + row.filter((cell) => cell.trim() !== "").length,
    0,
  );

  return (
    <div className="space-y-2.5">
      <div className="overflow-x-auto rounded-xl border border-rei-900/15 bg-white shadow-sm">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead>
            {grouped ? (
              <>
                <tr className="bg-rei-900 text-gold-200">
                  <th
                    rowSpan={2}
                    className="w-10 border border-rei-900/20 bg-rei-900 px-2 py-2 text-center text-[11px] font-extrabold text-gold-300"
                  >
                    #
                  </th>
                  {headerGroups.map((span, idx) =>
                    span.isGroup ? (
                      <th
                        key={`grp-${idx}-${span.label}`}
                        colSpan={span.colSpan}
                        className="border border-white/15 bg-rei-900 px-3 py-2 text-center text-[11px] font-extrabold uppercase tracking-wider text-gold-300"
                      >
                        {span.label}
                      </th>
                    ) : (
                      <th
                        key={`single-${idx}-${span.label}`}
                        rowSpan={2}
                        className="border border-white/15 bg-rei-900 px-3 py-2 text-center text-[11px] font-bold text-white"
                      >
                        {span.label}
                      </th>
                    ),
                  )}
                  {editable && config.allowAddRow && rows.length > 1 && (
                    <th rowSpan={2} className="w-10 border border-white/15 bg-rei-900 px-2 py-2 text-center text-[10px] font-bold text-white/70">
                      Aksi
                    </th>
                  )}
                </tr>
                <tr className="bg-[#f3edf2] text-rei-900">
                  {config.columns.map((col, idx) =>
                    col.group?.trim() ? (
                      <th
                        key={`${col.id}-${idx}`}
                        className="border border-rei-900/15 px-3 py-2 text-center text-[11px] font-bold text-rei-900"
                      >
                        {col.label}
                      </th>
                    ) : null,
                  )}
                </tr>
              </>
            ) : (
              <tr className="bg-rei-900 text-white">
                <th className="w-10 border border-white/15 px-2 py-2.5 text-center text-[11px] font-extrabold text-gold-300">
                  #
                </th>
                {config.columns.map((col, idx) => (
                  <th
                    key={`${col.id}-${idx}`}
                    className="border border-white/15 px-3 py-2.5 text-center text-[11px] font-bold text-white"
                  >
                    {col.label}
                  </th>
                ))}
                {editable && config.allowAddRow && rows.length > 1 && (
                  <th className="w-10 border border-white/15 px-2 py-2.5 text-center text-[10px] font-bold text-white/70">
                    Aksi
                  </th>
                )}
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-[#faf8fa]"}>
                <td className="border border-rei-900/15 bg-[#f6f3f6] px-2 py-1.5 text-center font-mono text-[11px] font-bold text-rei-900/55">
                  {rowIdx + 1}
                </td>
                {config.columns.map((col, colIdx) => {
                  const cellValue = row[colIdx] ?? "";
                  const alignClass = col.type === "number" || col.type === "currency" ? "text-right tabular-nums" : "text-left";
                  if (!editable) {
                    return (
                      <td
                        key={`${col.id}-${colIdx}`}
                        className={`border border-rei-900/15 px-2.5 ${compact ? "py-1.5" : "py-2"} text-xs text-rei-900 ${alignClass}`}
                      >
                        {cellValue.trim() ? (
                          <span className="whitespace-pre-wrap font-medium">{cellValue}</span>
                        ) : (
                          <span className="text-rei-900/25">-</span>
                        )}
                      </td>
                    );
                  }
                  return (
                    <td key={`${col.id}-${colIdx}`} className="border border-rei-900/15 p-0 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                      <input
                        ref={(el) => {
                          inputRefs.current[`${rowIdx}-${colIdx}`] = el;
                        }}
                        type="text"
                        inputMode={col.type === "number" || col.type === "currency" ? "decimal" : "text"}
                        value={cellValue}
                        placeholder={col.placeholder || ""}
                        onChange={(event) => updateCell(rowIdx, colIdx, event.target.value)}
                        onKeyDown={(event) => handleKeyDown(event, rowIdx, colIdx)}
                        aria-label={`Baris ${rowIdx + 1} ${col.label}`}
                        className={`w-full min-w-[100px] bg-transparent px-2.5 ${compact ? "py-1.5" : "py-2"} text-xs text-rei-900 outline-none placeholder:text-rei-900/25 ${alignClass}`}
                      />
                    </td>
                  );
                })}
                {editable && config.allowAddRow && rows.length > 1 && (
                  <td className="border border-rei-900/15 px-1.5 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(rowIdx)}
                      title="Hapus baris ini"
                      className="rounded-md px-1.5 py-1 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50"
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-rei-900/50">
          <div className="flex items-center gap-2">
            {config.allowAddRow && (
              <button
                type="button"
                onClick={addRow}
                className="rounded-lg border border-rei-900/15 bg-white px-3 py-1.5 text-xs font-bold text-rei-900 transition hover:border-gold-500 hover:bg-gold-200/25"
              >
                + Tambah Baris
              </button>
            )}
            <span>Gunakan Tab / Enter / panah atas-bawah untuk berpindah sel seperti Excel.</span>
          </div>
          <span>
            {rows.length} baris · {filledCells} sel terisi
          </span>
        </div>
      )}
    </div>
  );
}
