import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await getAdminSession()) return NextResponse.json({ success: false, message: "Sesi login habis, silakan login ulang." }, { status: 401 });

  const url = new URL(request.url);
  const idPeserta = Number(url.searchParams.get("peserta"));
  let day = (url.searchParams.get("day") ?? "").trim();
  let jenisTes = (url.searchParams.get("jenis_tes") ?? "").trim();
  if (!Number.isInteger(idPeserta) || idPeserta <= 0) return NextResponse.json({ success: false, message: "Peserta tidak valid." }, { status: 400 });
  if (jenisTes && jenisTes !== "pretest" && jenisTes !== "posttest") return NextResponse.json({ success: false, message: "Jenis tes tidak valid." }, { status: 400 });

  const [pesertaRows] = await db.execute("SELECT id,nama_peserta,nip,batch,jabatan,cabang FROM peserta WHERE id=? LIMIT 1", [idPeserta]);
  const peserta = (pesertaRows as Array<{ id: number; nama_peserta: string; nip: string; batch: string; jabatan: string | null; cabang: string | null }>)[0];
  if (!peserta) return NextResponse.json({ success: false, message: "Peserta tidak ditemukan." }, { status: 404 });

  if (!day || !jenisTes) {
    const [firstTestRows] = await db.execute(
      `SELECT s.day,s.jenis_tes FROM jawaban_peserta jp
       INNER JOIN soal s ON s.id=jp.id_soal
       WHERE jp.id_peserta=?
         AND (?='' OR LOWER(TRIM(s.day))=LOWER(TRIM(?)))
         AND (?='' OR s.jenis_tes=?)
       GROUP BY s.day,s.jenis_tes
       ORDER BY CAST(REGEXP_SUBSTR(s.day,'[0-9]+') AS UNSIGNED),s.day,FIELD(s.jenis_tes,'pretest','posttest')
       LIMIT 1`,
      [idPeserta, day, day, jenisTes, jenisTes],
    );
    const firstTest = (firstTestRows as Array<{ day: string; jenis_tes: "pretest" | "posttest" }>)[0];
    day ||= String(firstTest?.day ?? "");
    jenisTes ||= firstTest?.jenis_tes ?? "";
  }
  if (!day || !jenisTes) return NextResponse.json({ success: false, message: "Peserta ini belum memiliki jawaban." }, { status: 404 });

  const [questionRows] = await db.execute(
    `SELECT s.id AS id_soal,s.no_soal,s.day,s.pertanyaan,s.bobot,s.jenis_soal,s.pilihan_a,s.pilihan_b,s.pilihan_c,s.pilihan_d,s.jawaban_benar,s.tabel_config,s.kata_kunci,
      (SELECT GROUP_CONCAT(CONCAT(k.kata_kunci,' (',k.bobot,')') ORDER BY k.id SEPARATOR ', ') FROM soal_kata_kunci k WHERE k.id_soal=s.id) AS kata_kunci_bobot,
      jp.id AS id_jawaban,jp.jawaban,jp.file_path,jp.skor_auto,jp.nilai,jp.is_dikoreksi,jp.catatan_koreksi
     FROM soal s
     LEFT JOIN jawaban_peserta jp ON jp.id=(SELECT MAX(jp2.id) FROM jawaban_peserta jp2 WHERE jp2.id_soal=s.id AND jp2.id_peserta=?)
     WHERE LOWER(TRIM(s.day))=LOWER(TRIM(?)) AND s.jenis_tes=?
     ORDER BY s.no_soal ASC`,
    [idPeserta, day, jenisTes],
  );
  const questions = questionRows as Array<Record<string, unknown>>;
  const summary = {
    answered: questions.filter((row) => row.id_jawaban !== null).length,
    corrected: questions.filter((row) => Number(row.is_dikoreksi) === 1).length,
    total: questions.length,
    totalFinal: questions.reduce((sum, row) => sum + Number(row.nilai ?? 0), 0),
    totalAuto: questions.reduce((sum, row) => sum + Number(row.skor_auto ?? 0), 0),
    totalBobot: questions.reduce((sum, row) => sum + Number(row.bobot ?? 0), 0),
  };

  return NextResponse.json({ success: true, peserta, day, jenis_tes: jenisTes, questions, summary });
}
