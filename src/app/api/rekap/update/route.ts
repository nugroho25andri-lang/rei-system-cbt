import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

type Body = { id_peserta?: number; tes1?: number; tes2?: number; tes3?: number; tes4?: number; tes5?: number; tes6?: number; nilai_aadl?: number };

function clamp(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1000, Math.round(number * 100) / 100));
}

export async function POST(request: Request) {
  if (!await getAdminSession()) return NextResponse.json({ success: false, message: "Sesi login habis, silakan login ulang." }, { status: 401 });
  let body: Body;
  try {
    body = await request.json() as Body;
  } catch {
    return NextResponse.json({ success: false, message: "Data yang dikirim tidak valid." }, { status: 400 });
  }
  const idPeserta = Number(body.id_peserta);
  if (!Number.isInteger(idPeserta) || idPeserta <= 0) return NextResponse.json({ success: false, message: "ID peserta tidak valid." }, { status: 400 });

  const scores = { 1: clamp(body.tes1), 2: clamp(body.tes2), 3: clamp(body.tes3), 4: clamp(body.tes4), 5: clamp(body.tes5), 6: clamp(body.tes6) };
  const aadl = clamp(body.nilai_aadl);
  const connection = await db.getConnection();
  const emptyDays: string[] = [];
  try {
    await connection.beginTransaction();
    const [pesertaRows] = await connection.execute("SELECT id FROM peserta WHERE id=? LIMIT 1", [idPeserta]);
    if (!(pesertaRows as unknown[]).length) throw new Error("Peserta tidak ditemukan.");

    for (const dayNumber of [1, 2, 3, 4] as const) {
      const target = scores[dayNumber];
      const [answerRows] = await connection.execute(
        "SELECT jp.id FROM jawaban_peserta jp INNER JOIN soal s ON s.id=jp.id_soal WHERE jp.id_peserta=? AND CAST(REGEXP_SUBSTR(s.day,'[0-9]+') AS UNSIGNED)=? ORDER BY jp.id ASC",
        [idPeserta, dayNumber],
      );
      const ids = (answerRows as unknown as Array<{ id: number }>).map((row) => row.id);
      if (!ids.length) { emptyDays.push(`Day ${dayNumber}`); continue; }
      let distributed = 0;
      for (let index = 0; index < ids.length; index += 1) {
        const value = index === ids.length - 1
          ? Math.round((target - distributed) * 100) / 100
          : Math.round((target / ids.length) * 100) / 100;
        distributed += value;
        await connection.execute("UPDATE jawaban_peserta SET nilai=?, is_dikoreksi=1 WHERE id=? AND id_peserta=?", [value, ids[index], idPeserta]);
      }
    }

    const [day5Rows] = await connection.execute("SELECT id FROM penilaian_day5 WHERE id_peserta=? ORDER BY id DESC LIMIT 1", [idPeserta]);
    if ((day5Rows as unknown[]).length) {
      await connection.execute("UPDATE penilaian_day5 SET total_nilai=?, nilai_akhir=?, updated_at=NOW() WHERE id=?", [scores[5], scores[5], (day5Rows as unknown as Array<{ id: number }>)[0].id]);
    } else if (scores[5] > 0) {
      await connection.execute("INSERT INTO penilaian_day5 (id_peserta,total_nilai,nilai_akhir,created_at,updated_at) VALUES (?,?,?,NOW(),NOW())", [idPeserta, scores[5], scores[5]]);
    }

    const [day6Rows] = await connection.execute("SELECT id FROM penilaian_day6 WHERE id_peserta=? ORDER BY id DESC LIMIT 1", [idPeserta]);
    if ((day6Rows as unknown[]).length) {
      await connection.execute("UPDATE penilaian_day6 SET nilai=?, nilai_akhir=?, updated_at=NOW() WHERE id=?", [scores[6], scores[6], (day6Rows as unknown as Array<{ id: number }>)[0].id]);
    } else if (scores[6] > 0) {
      await connection.execute("INSERT INTO penilaian_day6 (id_peserta,nilai,nilai_akhir,created_at,updated_at) VALUES (?,?,?,NOW(),NOW())", [idPeserta, scores[6], scores[6]]);
    }

    const [aadlRows] = await connection.execute("SELECT id FROM penilaian_manual WHERE id_peserta=? LIMIT 1", [idPeserta]);
    if ((aadlRows as unknown[]).length) {
      await connection.execute("UPDATE penilaian_manual SET total_manual=? WHERE id=?", [aadl, (aadlRows as unknown as Array<{ id: number }>)[0].id]);
    } else if (aadl > 0) {
      await connection.execute("INSERT INTO penilaian_manual (id_peserta,total_manual) VALUES (?,?)", [idPeserta, aadl]);
    }

    await connection.commit();
    const message = emptyDays.length
      ? `Nilai berhasil disimpan. Catatan: belum ada jawaban untuk ${emptyDays.join(", ")}, jadi nilai day tersebut tidak tersimpan.`
      : "Nilai berhasil disimpan.";
    return NextResponse.json({ success: true, message });
  } catch (error) {
    await connection.rollback();
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Gagal menyimpan nilai." }, { status: 500 });
  } finally {
    connection.release();
  }
}
