import ExcelJS from "exceljs";
import { getAdminSession } from "@/lib/session";
import { getTrainerAnalysis } from "@/lib/trainer-evaluation";
import { TRAINER_CRITERIA } from "@/lib/trainer-evaluation-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADER_FILL = "FF3B2F2F";
const BORDER_COLOR = "FFE8E1D8";

function styleHeader(row: ExcelJS.Row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER_COLOR } },
      left: { style: "thin", color: { argb: BORDER_COLOR } },
      bottom: { style: "thin", color: { argb: BORDER_COLOR } },
      right: { style: "thin", color: { argb: BORDER_COLOR } },
    };
  });
}

function styleDataRows(sheet: ExcelJS.Worksheet) {
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.font = { size: 10 };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: BORDER_COLOR } },
        left: { style: "thin", color: { argb: BORDER_COLOR } },
        bottom: { style: "thin", color: { argb: BORDER_COLOR } },
        right: { style: "thin", color: { argb: BORDER_COLOR } },
      };
    });
  });
}

function addTableSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  widths: number[],
  rows: Array<Array<string | number>>,
) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = widths.map((width) => ({ width }));
  sheet.addRow(headers);
  styleHeader(sheet.getRow(1));
  rows.forEach((row) => sheet.addRow(row));
  styleDataRows(sheet);
  if (rows.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: headers.length } };
  return sheet;
}

function formatExportDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${value}T00:00:00+07:00`));
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return new Response("Tidak diizinkan.", { status: 401 });
  if (session.role !== "superadmin" && session.role !== "admin") return new Response("Akses ditolak.", { status: 403 });

  const params = new URL(request.url).searchParams;
  const analysis = await getTrainerAnalysis({
    batch: params.get("batch") ?? "",
    trainer: params.get("trainer") ?? "",
    includeAllSessions: true,
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CBT REI";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Ringkasan");
  summary.columns = [{ width: 30 }, { width: 48 }];
  summary.addRow(["RINGKASAN ANALISIS PENILAIAN TRAINER"]).font = { bold: true, size: 14 };
  summary.addRow([]);
  [
    ["Filter batch", analysis.filters.batch || "Semua batch"],
    ["Filter trainer", analysis.filters.trainer || "Semua trainer"],
    ["Total penilaian", analysis.totals.responses],
    ["Trainer dinilai", analysis.totals.trainers],
    ["Peserta menilai", analysis.totals.participants],
    ["Rata-rata nilai", Number(analysis.totals.average.toFixed(2))],
    ["Jumlah sesi", analysis.totals.sessions],
    ["Total durasi (menit)", analysis.totals.minutes],
    ["Tanggal data", formatExportDate(analysis.generatedAt)],
    ["Diekspor", new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date())],
  ].forEach(([label, value]) => {
    const row = summary.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4EFE7" } };
  });

  addTableSheet(
    workbook,
    "Ranking Trainer",
    ["Peringkat", "Trainer", "Batch", "Rata-rata", "Penilaian", "Sesi", "Durasi (menit)", "Tren", "Aspek terlemah", "Nilai aspek terlemah", "Status", "Rekomendasi"],
    [11, 28, 24, 14, 14, 10, 16, 16, 26, 20, 18, 72],
    analysis.ranking.map((entry, index) => [
      index + 1,
      entry.trainer,
      entry.batches.join(", "),
      Number(entry.average.toFixed(2)),
      entry.responses,
      entry.sessions,
      entry.minutes,
      entry.trend ? `${entry.trend.delta >= 0 ? "+" : ""}${entry.trend.delta.toFixed(2)}` : "-",
      entry.weakest.label,
      Number(entry.weakest.value.toFixed(2)),
      entry.tone === "good" ? "Baik" : entry.tone === "watch" ? "Pantau" : "Perlu evaluasi",
      entry.action,
    ]),
  );

  addTableSheet(
    workbook,
    "Rata-rata Aspek",
    ["Aspek", "Rata-rata", "Nilai <= 2", "Pertanyaan"],
    [28, 16, 14, 80],
    analysis.criteria.map((criterion) => [
      criterion.label,
      Number(criterion.average.toFixed(2)),
      criterion.lowCount,
      criterion.question,
    ]),
  );

  addTableSheet(
    workbook,
    "Detail Penilaian",
    [
      "Tanggal", "Hari ke", "Batch", "Trainer", "NIP Peserta", "Nama Peserta",
      "Jam Mulai", "Jam Selesai", "Durasi (menit)", "Rata-rata",
      ...TRAINER_CRITERIA.map((criterion) => criterion.label),
      "Hal Terbaik", "Saran Perbaikan", "Sumber",
    ],
    [16, 10, 16, 28, 20, 30, 14, 14, 16, 14, ...TRAINER_CRITERIA.map(() => 20), 48, 48, 14],
    analysis.sessions.map((row) => [
      row.tanggal,
      row.day_ke,
      row.batch,
      row.trainer,
      row.nip,
      row.nama_peserta,
      row.jam_mulai,
      row.jam_selesai,
      row.durasi_menit,
      Number(row.rata_rata.toFixed(2)),
      ...TRAINER_CRITERIA.map((criterion) => row.scores[criterion.key]),
      row.hal_terbaik,
      row.perbaikan,
      row.sumber,
    ]),
  );

  addTableSheet(
    workbook,
    "Rekomendasi",
    ["Trainer", "Status", "Ringkasan", "Langkah Berikutnya"],
    [28, 18, 80, 90],
    analysis.recommendations.map((item) => [
      item.trainer,
      item.tone === "attention" ? "Perlu evaluasi" : "Pantau",
      item.headline,
      item.steps.join("\n"),
    ]),
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const batchSuffix = analysis.filters.batch.replace(/[^0-9A-Za-z_-]+/g, "");
  const fileName = `analisis-trainer${batchSuffix ? `-batch-${batchSuffix}` : ""}.xlsx`;

  return new Response(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
