import { NextResponse } from "next/server";
import { logAdminActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";

type Item = { id_soal?: number; nilai?: string | number; catatan?: string };

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: "Sesi login habis, silakan login ulang." }, { status: 401 });

  let body: { id_peserta?: number; day?: string; jenis_tes?: string; items?: Item[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Data tidak valid." }, { status: 400 });
  }
  const idPeserta = Number(body.id_peserta);
  const day = String(body.day ?? "").trim();
  const jenisTes = String(body.jenis_tes ?? "").trim();
  const items = Array.isArray(body.items) ? body.items : [];
  if (!Number.isInteger(idPeserta) || idPeserta <= 0 || !day || (jenisTes !== "pretest" && jenisTes !== "posttest")) return NextResponse.json({ success: false, message: "Peserta, day, atau jenis tes tidak valid." }, { status: 400 });
  if (!items.length) return NextResponse.json({ success: false, message: "Tidak ada nilai yang dikirim." }, { status: 400 });

  const [questionRows] = await db.execute(
    "SELECT id,bobot FROM soal WHERE LOWER(TRIM(day))=LOWER(TRIM(?)) AND jenis_tes=?",
    [day, jenisTes],
  );
  const questions = new Map((questionRows as Array<{ id: number; bobot: number }>).map((row) => [Number(row.id), Number(row.bobot)]));

  const connection = await db.getConnection();
  let saved = 0;
  try {
    await connection.beginTransaction();
    const [pesertaRows] = await connection.execute("SELECT id FROM peserta WHERE id=? LIMIT 1", [idPeserta]);
    if (!(pesertaRows as unknown[]).length) throw new Error("Peserta tidak ditemukan.");

    for (const item of items) {
      const idSoal = Number(item.id_soal);
      if (!questions.has(idSoal)) continue;
      const raw = item.nilai === null || item.nilai === undefined ? "" : String(item.nilai).trim();
      if (raw === "") continue;
      const bobot = questions.get(idSoal) ?? 0;
      const parsed = Number(raw.replace(",", "."));
      if (!Number.isFinite(parsed)) continue;
      const nilai = Math.max(0, Math.min(bobot, Math.round(parsed * 100) / 100));
      const catatan = String(item.catatan ?? "").trim().slice(0, 2000);

      const [existing] = await connection.execute(
        "SELECT id FROM jawaban_peserta WHERE id_peserta=? AND id_soal=? ORDER BY id DESC LIMIT 1",
        [idPeserta, idSoal],
      );
      if ((existing as unknown[]).length) {
        await connection.execute(
          "UPDATE jawaban_peserta SET nilai=?, catatan_koreksi=?, is_dikoreksi=1, is_koreksi=1 WHERE id=?",
          [nilai, catatan || null, (existing as Array<{ id: number }>)[0].id],
        );
      } else {
        await connection.execute(
          "INSERT INTO jawaban_peserta (id_peserta,id_soal,jawaban,skor_auto,nilai,catatan_koreksi,is_dikoreksi,is_koreksi,created_at) VALUES (?,?,NULL,0,?,?,1,1,NOW())",
          [idPeserta, idSoal, nilai, catatan || null],
        );
      }
      saved += 1;
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Gagal menyimpan koreksi." }, { status: 500 });
  } finally {
    connection.release();
  }

  if (!saved) return NextResponse.json({ success: false, message: "Tidak ada nilai yang diisi." }, { status: 400 });

  await logAdminActivity({
    action: "score_save",
    session,
    entity: "jawaban_peserta",
    entityId: idPeserta,
    detail: `${saved} nilai ${jenisTes} ${day} untuk peserta id ${idPeserta} disimpan lewat popup koreksi.`,
  });

  const [summaryRows] = await db.execute(
    `SELECT COUNT(DISTINCT s.id) AS total,
       COUNT(DISTINCT CASE WHEN jp.id IS NOT NULL THEN s.id END) AS answered,
       COUNT(DISTINCT CASE WHEN jp.is_dikoreksi=1 THEN s.id END) AS corrected,
       COALESCE(SUM(jp.nilai),0) AS total_final,
       COALESCE(SUM(s.bobot),0) AS total_bobot
     FROM soal s
     LEFT JOIN jawaban_peserta jp ON jp.id=(SELECT MAX(jp2.id) FROM jawaban_peserta jp2 WHERE jp2.id_soal=s.id AND jp2.id_peserta=?)
     WHERE LOWER(TRIM(s.day))=LOWER(TRIM(?)) AND s.jenis_tes=?`,
    [idPeserta, day, jenisTes],
  );
  const summary = (summaryRows as Array<{ total: number; answered: number; corrected: number; total_final: number; total_bobot: number }>)[0];

  return NextResponse.json({
    success: true,
    message: saved === 1 ? "1 nilai berhasil disimpan ke database." : `${saved} nilai berhasil disimpan ke database.`,
    saved,
    summary: {
      total: Number(summary?.total ?? 0),
      answered: Number(summary?.answered ?? 0),
      corrected: Number(summary?.corrected ?? 0),
      totalFinal: Number(summary?.total_final ?? 0),
      totalBobot: Number(summary?.total_bobot ?? 0),
    },
  });
}
