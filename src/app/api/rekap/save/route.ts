import { NextResponse } from "next/server";
import { logAdminActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";
type ColumnRow = { COLUMN_NAME: string };
async function tableColumns(connection: Awaited<ReturnType<typeof db.getConnection>>, table: string) {
  const [rows] = await connection.execute("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?", [table]);
  return new Set((rows as ColumnRow[]).map((row) => row.COLUMN_NAME));
}
async function saveDay(connection: Awaited<ReturnType<typeof db.getConnection>>, table: string, participantId: number, value: number) {
  const columns = await tableColumns(connection, table);
  if (!columns.size) throw new Error(`Tabel ${table} tidak ditemukan.`);
  if (!columns.has("id_peserta")) throw new Error(`Tabel ${table} tidak memiliki kolom id_peserta.`);
  const valueColumns = ["total_nilai", "nilai_akhir"].filter((column) => columns.has(column));
  if (!valueColumns.length) throw new Error(`Tabel ${table} tidak memiliki kolom total_nilai/nilai_akhir.`);
  const [rows] = await connection.execute(`SELECT id FROM \`${table}\` WHERE id_peserta=? ORDER BY id DESC LIMIT 1`, [participantId]);
  const existingId = Number((rows as Array<{ id: number }>)[0]?.id ?? 0);
  if (existingId) {
    await connection.execute(`UPDATE \`${table}\` SET ${valueColumns.map((column) => `\`${column}\`=?`).join(",")} WHERE id=? AND id_peserta=?`, [...valueColumns.map(() => value), existingId, participantId]);
  } else {
    await connection.execute(`INSERT INTO \`${table}\` (id_peserta,${valueColumns.map((column) => `\`${column}\``).join(",")}) VALUES (${Array(valueColumns.length + 1).fill("?").join(",")})`, [participantId, ...valueColumns.map(() => value)]);
  }
}
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: "Sesi login habis, silakan login ulang." });
  const form = await request.formData();
  const participantId = Number(form.get("id_peserta") ?? 0);
  const scores = ["tes1", "tes2", "tes3", "tes4", "tes5", "tes6", "nilai_aadl"].map((name) => {
    const raw = Number(form.get(name) ?? 0);
    return Number.isFinite(raw) ? Math.max(0, Math.min(1000, raw)) : 0;
  });
  if (!Number.isInteger(participantId) || participantId <= 0) return NextResponse.json({ success: false, message: "ID peserta tidak valid." });
  const connection = await db.getConnection();
  const noAnswers: string[] = [];
  try {
    await connection.beginTransaction();
    const [participantRows] = await connection.execute("SELECT id FROM peserta WHERE id=? LIMIT 1", [participantId]);
    if (!(participantRows as unknown[]).length) throw new Error("Peserta tidak ditemukan.");
    for (const dayNumber of [1, 2, 3, 4]) {
      const [primaryRows] = await connection.execute("SELECT j.id FROM jawaban_peserta j INNER JOIN soal s ON j.id_soal=s.id WHERE j.id_peserta=? AND CAST(NULLIF(SUBSTRING_INDEX(SUBSTRING_INDEX(LOWER(TRIM(s.day)),'day',-1),' ',1),'') AS UNSIGNED)=? ORDER BY j.id ASC", [participantId, dayNumber]);
      let ids = (primaryRows as Array<{ id: number }>).map((row) => Number(row.id));
      if (!ids.length) {
        const regex = `(^|[^0-9])day[[:space:]]*${dayNumber}([^0-9]|$)`;
        const [fallbackRows] = await connection.execute("SELECT j.id FROM jawaban_peserta j INNER JOIN soal s ON j.id_soal=s.id WHERE j.id_peserta=? AND (LOWER(TRIM(s.day)) REGEXP ? OR LOWER(TRIM(s.day))=?) ORDER BY j.id ASC", [participantId, regex, String(dayNumber)]);
        ids = (fallbackRows as Array<{ id: number }>).map((row) => Number(row.id));
      }
      if (!ids.length) { noAnswers.push(`Day ${dayNumber}`); continue; }
      const perQuestion = Math.round(scores[dayNumber - 1] / ids.length * 100) / 100;
      let assigned = 0;
      for (const [index, answerId] of ids.entries()) {
        const score = index === ids.length - 1 ? Math.round((scores[dayNumber - 1] - assigned) * 100) / 100 : perQuestion;
        await connection.execute("UPDATE jawaban_peserta SET nilai=? WHERE id=? AND id_peserta=?", [score, answerId, participantId]);
        assigned += score;
      }
    }
    await saveDay(connection, "penilaian_day5", participantId, scores[4]);
    await saveDay(connection, "penilaian_day6", participantId, scores[5]);
    const [manualRows] = await connection.execute("SELECT id FROM penilaian_manual WHERE id_peserta=? LIMIT 1", [participantId]);
    const manualId = Number((manualRows as Array<{ id: number }>)[0]?.id ?? 0);
    if (manualId) await connection.execute("UPDATE penilaian_manual SET total_manual=? WHERE id=? AND id_peserta=?", [scores[6], manualId, participantId]);
    else await connection.execute("INSERT INTO penilaian_manual (id_peserta,total_manual) VALUES (?,?)", [participantId, scores[6]]);
    await connection.commit();
    let message = "Nilai berhasil disimpan.";
    if (noAnswers.length) message += ` Catatan: tidak ada data jawaban untuk ${noAnswers.join(", ")} (nilai day tsb tidak tersimpan karena belum ada baris jawaban_peserta).`;
    await logAdminActivity({
      action: "recap_save",
      session,
      entity: "peserta",
      entityId: participantId,
      detail: `Rekap nilai peserta id ${participantId} disimpan. Skor: ${scores.join(", ")}.`,
    });
    return NextResponse.json({ success: true, message, day_tanpa_soal: noAnswers });
  } catch (error) {
    await connection.rollback();
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Gagal menyimpan nilai." }, { status: 500 });
  } finally { connection.release(); }
}
