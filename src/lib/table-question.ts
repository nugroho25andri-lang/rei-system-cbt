export type TableColumnType = "text" | "number" | "currency";

export type TableColumn = {
  id: string;
  label: string;
  group?: string;
  type?: TableColumnType;
  placeholder?: string;
};

export type TableConfig = {
  columns: TableColumn[];
  defaultRows: number;
  allowAddRow: boolean;
  presetRows?: string[][];
};

export type TableAnswerPayload = {
  __type: "table";
  rows: string[][];
};

export type HeaderGroupSpan = {
  label: string;
  colSpan: number;
  isGroup: boolean;
  column?: TableColumn;
};

export const PEMBUKUAN_TABLE_PRESET: TableConfig = {
  defaultRows: 2,
  allowAddRow: true,
  columns: [
    { id: "col_1", group: "Pemasukan (Debit)", label: "Keterangan", type: "text", placeholder: "Contoh: Penjualan Tunai" },
    { id: "col_2", group: "Pemasukan (Debit)", label: "No Nota/Ref.", type: "text", placeholder: "Contoh: 001/..." },
    { id: "col_3", group: "Pemasukan (Debit)", label: "Nominal Pemasukan", type: "currency", placeholder: "0" },
    { id: "col_4", group: "Pemasukan (Debit)", label: "Total Pemasukan", type: "currency", placeholder: "0" },
    { id: "col_5", group: "Pengeluaran (Kredit)", label: "Keterangan", type: "text", placeholder: "Contoh: Biaya Adm" },
    { id: "col_6", group: "Pengeluaran (Kredit)", label: "No Nota", type: "text", placeholder: "Contoh: -" },
    { id: "col_7", group: "Pengeluaran (Kredit)", label: "Nominal Pengeluaran", type: "currency", placeholder: "0" },
    { id: "col_8", group: "Pengeluaran (Kredit)", label: "Total Pengeluaran", type: "currency", placeholder: "0" },
  ],
};

export const SIMPLE_TABLE_PRESET: TableConfig = {
  defaultRows: 3,
  allowAddRow: true,
  columns: [
    { id: "col_1", group: "", label: "No", type: "text", placeholder: "1" },
    { id: "col_2", group: "", label: "Uraian / Keterangan", type: "text", placeholder: "Isi keterangan" },
    { id: "col_3", group: "", label: "Nominal / Nilai", type: "currency", placeholder: "0" },
  ],
};

export function normalizeTableConfig(raw: unknown): TableConfig | null {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const rawCols = Array.isArray(obj.columns) ? obj.columns : [];
  const columns: TableColumn[] = rawCols
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const col = item as Record<string, unknown>;
      const label = String(col.label ?? "").trim();
      if (!label) return null;
      const type: TableColumnType = col.type === "number" || col.type === "currency" ? col.type : "text";
      const group = String(col.group ?? "").trim();
      const placeholder = String(col.placeholder ?? "").trim();
      return {
        id: String(col.id ?? `col_${index + 1}`).trim() || `col_${index + 1}`,
        label: label.slice(0, 120),
        ...(group ? { group: group.slice(0, 120) } : {}),
        type,
        ...(placeholder ? { placeholder: placeholder.slice(0, 120) } : {}),
      } satisfies TableColumn;
    })
    .filter((item): item is TableColumn => item !== null);

  if (!columns.length) return null;

  const rawRows = Math.trunc(Number(obj.defaultRows ?? 1));
  const defaultRows = Number.isFinite(rawRows) ? Math.min(Math.max(rawRows, 1), 30) : 1;
  const allowAddRow = obj.allowAddRow !== false;

  let presetRows: string[][] | undefined;
  if (Array.isArray(obj.presetRows)) {
    const cleaned = obj.presetRows
      .slice(0, defaultRows)
      .map((row) =>
        Array.isArray(row)
          ? columns.map((_, colIdx) => String(row[colIdx] ?? "").slice(0, 500))
          : columns.map(() => ""),
      );
    if (cleaned.some((row) => row.some((cell) => cell.trim() !== ""))) {
      presetRows = cleaned;
    }
  }

  return {
    columns,
    defaultRows,
    allowAddRow,
    ...(presetRows ? { presetRows } : {}),
  };
}

export function hasGroupedHeaders(columns: TableColumn[]): boolean {
  return columns.some((col) => Boolean(col.group && col.group.trim()));
}

export function buildHeaderGroups(columns: TableColumn[]): HeaderGroupSpan[] {
  const spans: HeaderGroupSpan[] = [];
  for (const col of columns) {
    const group = (col.group ?? "").trim();
    const last = spans[spans.length - 1];
    if (group && last && last.isGroup && last.label === group) {
      last.colSpan += 1;
    } else if (group) {
      spans.push({ label: group, colSpan: 1, isGroup: true });
    } else {
      spans.push({ label: col.label, colSpan: 1, isGroup: false, column: col });
    }
  }
  return spans;
}

export function createInitialTableRows(config: TableConfig): string[][] {
  const count = Math.max(1, config.defaultRows || 1);
  return Array.from({ length: count }, (_, rowIdx) =>
    config.columns.map((_, colIdx) => config.presetRows?.[rowIdx]?.[colIdx] ?? ""),
  );
}

export function parseTableAnswer(raw: string | null | undefined, colCount?: number): string[][] | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    let rows: unknown[] = [];
    if (Array.isArray(parsed)) {
      rows = parsed;
    } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as TableAnswerPayload).rows)) {
      rows = (parsed as TableAnswerPayload).rows;
    } else {
      return null;
    }
    return rows.map((row) => {
      const cells = Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [String(row ?? "")];
      if (!colCount || colCount <= 0) return cells;
      return Array.from({ length: colCount }, (_, idx) => cells[idx] ?? "");
    });
  } catch {
    return null;
  }
}

export function serializeTableAnswer(rows: string[][]): string {
  const payload: TableAnswerPayload = { __type: "table", rows };
  return JSON.stringify(payload);
}

export function hasTableAnswerContent(raw: string | null | undefined): boolean {
  const rows = parseTableAnswer(raw);
  if (!rows) return false;
  return rows.some((row) => row.some((cell) => cell.trim() !== ""));
}

export function tableAnswerToPlainText(raw: string | null | undefined): string {
  const rows = parseTableAnswer(raw);
  if (!rows) return String(raw ?? "");
  return rows
    .map((row) => row.map((cell) => cell.trim()).filter(Boolean).join(" "))
    .filter(Boolean)
    .join(" | ");
}

export function formatTableAnswerPreview(raw: string | null | undefined): string {
  const rows = parseTableAnswer(raw);
  if (!rows) return String(raw ?? "-");
  const filledRows = rows.filter((row) => row.some((cell) => cell.trim() !== ""));
  if (!filledRows.length) return "[Tabel kosong]";
  const sample = filledRows[0].map((cell) => cell.trim()).filter(Boolean).slice(0, 3).join(", ");
  return `[Tabel: ${filledRows.length} baris${sample ? ` · ${sample}` : ""}]`;
}
