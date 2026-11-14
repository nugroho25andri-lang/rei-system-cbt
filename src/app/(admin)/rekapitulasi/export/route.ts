import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const joins = `
  LEFT JOIN (SELECT j.id_peserta,
    SUM(CASE WHEN s.jenis_tes='pretest' AND TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*1$' THEN COALESCE(j.nilai,0) ELSE 0 END) pretest1,
    SUM(CASE WHEN s.jenis_tes='pretest' AND TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*2$' THEN COALESCE(j.nilai,0) ELSE 0 END) pretest2,
    SUM(CASE WHEN s.jenis_tes='pretest' AND TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*3$' THEN COALESCE(j.nilai,0) ELSE 0 END) pretest3,
    SUM(CASE WHEN s.jenis_tes='pretest' AND TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*4$' THEN COALESCE(j.nilai,0) ELSE 0 END) pretest4,
    SUM(CASE WHEN s.jenis_tes='posttest' AND TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*1$' THEN COALESCE(j.nilai,0) ELSE 0 END) tes1,
    SUM(CASE WHEN s.jenis_tes='posttest' AND TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*2$' THEN COALESCE(j.nilai,0) ELSE 0 END) tes2,
    SUM(CASE WHEN s.jenis_tes='posttest' AND TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*3$' THEN COALESCE(j.nilai,0) ELSE 0 END) tes3,
    SUM(CASE WHEN s.jenis_tes='posttest' AND TRIM(UPPER(s.day)) REGEXP '^DAY[[:space:]]*4$' THEN COALESCE(j.nilai,0) ELSE 0 END) tes4
    FROM jawaban_peserta j LEFT JOIN soal s ON j.id_soal=s.id GROUP BY j.id_peserta) t14 ON p.id=t14.id_peserta
  LEFT JOIN (SELECT id_peserta,MAX(nilai_akhir) nilai_akhir FROM penilaian_day5 GROUP BY id_peserta) d5 ON p.id=d5.id_peserta
  LEFT JOIN (SELECT id_peserta,MAX(nilai_akhir) nilai_akhir FROM penilaian_day6 GROUP BY id_peserta) d6 ON p.id=d6.id_peserta
  LEFT JOIN (SELECT id_peserta,MAX(total_manual) total_manual FROM penilaian_manual GROUP BY id_peserta) aadl ON p.id=aadl.id_peserta`;
const totalExpression = "(COALESCE(t14.tes1,0)+COALESCE(t14.tes2,0)+COALESCE(t14.tes3,0)+COALESCE(t14.tes4,0)+COALESCE(d5.nilai_akhir,0)+COALESCE(d6.nilai_akhir,0)+COALESCE(aadl.total_manual,0))";

type Row = {
  nip: string;
  nama_peserta: string;
  jabatan: string | null;
  batch: string;
  cabang: string | null;
  pretest1: number;
  pretest2: number;
  pretest3: number;
  pretest4: number;
  tes1: number;
  tes2: number;
  tes3: number;
  tes4: number;
  tes5: number;
  tes6: number;
  nilai_aadl: number;
  total_nilai: number;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(value);
}

export async function GET(request: Request) {
  if (!await getAdminSession()) return new Response("Tidak diizinkan.", { status: 401 });

  const url = new URL(request.url);
  const batch = (url.searchParams.get("batch") ?? "").trim();
  const q = (url.searchParams.get("q") ?? "").trim();
  const like = `%${q}%`;

  const [rowsResult, kkmRows] = await Promise.all([
    db.execute(
      `SELECT p.nip,p.nama_peserta,p.jabatan,p.batch,p.cabang,
        COALESCE(t14.pretest1,0) pretest1,COALESCE(t14.pretest2,0) pretest2,COALESCE(t14.pretest3,0) pretest3,COALESCE(t14.pretest4,0) pretest4,
        COALESCE(t14.tes1,0) tes1,COALESCE(t14.tes2,0) tes2,COALESCE(t14.tes3,0) tes3,COALESCE(t14.tes4,0) tes4,
        COALESCE(d5.nilai_akhir,0) tes5,COALESCE(d6.nilai_akhir,0) tes6,COALESCE(aadl.total_manual,0) nilai_aadl,
        ${totalExpression} total_nilai
       FROM peserta p ${joins}
       WHERE (?='' OR p.batch=?) AND (?='' OR p.nama_peserta LIKE ? OR p.nip LIKE ?)
       ORDER BY p.batch ASC, p.nama_peserta ASC`,
      [batch, batch, q, like, like],
    ),
    db.execute("SELECT nilai_kkm FROM kkm LIMIT 1"),
  ]);
  const rows = rowsResult[0] as Row[];
  const kkm = Number((kkmRows[0] as Array<{ nilai_kkm: number }>)[0]?.nilai_kkm ?? 750);
  const passed = rows.filter((row) => Number(row.total_nilai) >= kkm).length;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CBT REI";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Rekap Nilai", { views: [{ state: "frozen", ySplit: 5 }] });
  sheet.columns = [
    { key: "no", width: 6 },
    { key: "nip", width: 20 },
    { key: "nama", width: 32 },
    { key: "jabatan", width: 26 },
    { key: "batch", width: 9 },
    { key: "cabang", width: 20 },
    { key: "pretest1", width: 12 },
    { key: "tes1", width: 12 },
    { key: "pretest2", width: 12 },
    { key: "tes2", width: 12 },
    { key: "pretest3", width: 12 },
    { key: "tes3", width: 12 },
    { key: "pretest4", width: 12 },
    { key: "tes4", width: 12 },
    { key: "tes5", width: 11 },
    { key: "tes6", width: 11 },
    { key: "aadl", width: 11 },
    { key: "total", width: 12 },
    { key: "status", width: 14 },
  ];

  sheet.mergeCells(1, 1, 1, 19);
  const title = sheet.getCell(1, 1);
  title.value = "REKAPITULASI NILAI CBT RAJA EMAS INDONESIA";
  title.font = { bold: true, size: 15, color: { argb: "FF1F1A17" } };
  title.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, 19);
  const subtitle = sheet.getCell(2, 1);
  subtitle.value = `${batch ? `Batch ${batch}` : "Semua batch"}${q ? ` · Pencarian: ${q}` : ""} · KKM ${kkm} · Diekspor ${formatDate(new Date())}`;
  subtitle.font = { size: 10, color: { argb: "FF6B5E57" } };
  sheet.getRow(2).height = 20;

  sheet.mergeCells(3, 1, 3, 19);
  const summaryLine = sheet.getCell(3, 1);
  summaryLine.value = `Jumlah peserta: ${rows.length}   |   Lulus: ${passed}   |   Tidak lulus: ${rows.length - passed}   |   KKM: ${kkm}`;
  summaryLine.font = { bold: true, size: 10, color: { argb: "FF3B2F2F" } };
  summaryLine.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4EFE7" } };
  summaryLine.alignment = { vertical: "middle" };
  sheet.getRow(3).height = 22;

  const baseHeaders = ["No", "NIP", "Nama", "Jabatan", "Batch", "Cabang"];
  baseHeaders.forEach((label, index) => {
    const column = index + 1;
    sheet.mergeCells(4, column, 5, column);
    sheet.getCell(4, column).value = label;
  });
  ["Day 1", "Day 2", "Day 3", "Day 4"].forEach((day, index) => {
    const firstColumn = 7 + index * 2;
    sheet.mergeCells(4, firstColumn, 4, firstColumn + 1);
    sheet.getCell(4, firstColumn).value = day;
    sheet.getCell(5, firstColumn).value = "Pretest";
    sheet.getCell(5, firstColumn + 1).value = "Posttest";
  });
  ["Day 5", "Day 6", "AADL", "Total", "Status"].forEach((label, index) => {
    const column = 15 + index;
    sheet.mergeCells(4, column, 5, column);
    sheet.getCell(4, column).value = label;
  });
  [4, 5].forEach((rowNumber) => {
    const header = sheet.getRow(rowNumber);
    header.height = rowNumber === 4 ? 22 : 20;
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B2F2F" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = { top: { style: "thin", color: { argb: "FFD9C7A7" } }, left: { style: "thin", color: { argb: "FFD9C7A7" } }, bottom: { style: "thin", color: { argb: "FFD9C7A7" } }, right: { style: "thin", color: { argb: "FFD9C7A7" } } };
    });
  });

  rows.forEach((row, index) => {
    const total = Number(row.total_nilai ?? 0);
    const lulus = total >= kkm;
    const dataRow = sheet.addRow([
      index + 1,
      row.nip,
      row.nama_peserta,
      row.jabatan ?? "",
      row.batch ?? "",
      row.cabang ?? "",
      Number(row.pretest1 ?? 0),
      Number(row.tes1 ?? 0),
      Number(row.pretest2 ?? 0),
      Number(row.tes2 ?? 0),
      Number(row.pretest3 ?? 0),
      Number(row.tes3 ?? 0),
      Number(row.pretest4 ?? 0),
      Number(row.tes4 ?? 0),
      Number(row.tes5 ?? 0),
      Number(row.tes6 ?? 0),
      Number(row.nilai_aadl ?? 0),
      total,
      lulus ? "Lulus" : "Tidak Lulus",
    ]);
    dataRow.eachCell((cell, columnNumber) => {
      cell.border = { top: { style: "thin", color: { argb: "FFE8E1D8" } }, left: { style: "thin", color: { argb: "FFE8E1D8" } }, bottom: { style: "thin", color: { argb: "FFE8E1D8" } }, right: { style: "thin", color: { argb: "FFE8E1D8" } } };
      cell.font = { size: 10 };
      if (index % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAF8F5" } };
      cell.alignment = { vertical: "middle", horizontal: columnNumber >= 7 ? "right" : "left" };
    });
    dataRow.height = 20;
    for (let column = 7; column <= 18; column += 1) dataRow.getCell(column).numFmt = "#,##0.##";
    dataRow.getCell(18).font = { bold: true, size: 10 };
    dataRow.getCell(19).font = { bold: true, size: 10, color: { argb: lulus ? "FF047857" : "FFB91C1C" } };
    dataRow.getCell(19).fill = { type: "pattern", pattern: "solid", fgColor: { argb: lulus ? "FFECFDF5" : "FFFEF2F2" } };
    dataRow.getCell(19).alignment = { horizontal: "center", vertical: "middle" };
  });

  sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + rows.length, column: 19 } };

  const summary = workbook.addWorksheet("Ringkasan");
  summary.columns = [{ width: 28 }, { width: 42 }];
  summary.mergeCells(1, 1, 1, 2);
  summary.getCell(1, 1).value = "RINGKASAN REKAPITULASI";
  summary.getCell(1, 1).font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  summary.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B2F2F" } };
  summary.getRow(1).height = 26;
  summary.addRow([]);
  [
    ["Filter batch", batch || "Semua batch"],
    ["Pencarian", q || "-"],
    ["Jumlah peserta", rows.length],
    ["Lulus (KKM)", passed],
    ["Tidak lulus", rows.length - passed],
    ["Rata-rata total nilai", rows.length ? Math.round((rows.reduce((sum, row) => sum + Number(row.total_nilai ?? 0), 0) / rows.length) * 100) / 100 : 0],
    ["KKM", kkm],
    ["Diekspor", formatDate(new Date())],
  ].forEach(([label, value]) => {
    const row = summary.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4EFE7" } };
    row.getCell(2).alignment = { horizontal: "left" };
    row.eachCell((cell) => {
      cell.border = { top: { style: "thin", color: { argb: "FFE8E1D8" } }, left: { style: "thin", color: { argb: "FFE8E1D8" } }, bottom: { style: "thin", color: { argb: "FFE8E1D8" } }, right: { style: "thin", color: { argb: "FFE8E1D8" } } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const safeBatch = batch.replace(/[^0-9A-Za-z_-]+/g, "");
  const fileName = `rekap-nilai-cbt${safeBatch ? `-batch-${safeBatch}` : ""}.xlsx`;

  return new Response(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
