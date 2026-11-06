"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/session";

export async function saveKoreksiAction(formData: FormData) {
  const session = await requireAdminSession();
  const idPeserta = Number(formData.get("id_peserta"));
  const day = String(formData.get("day") ?? "").trim();
  if (!Number.isInteger(idPeserta) || idPeserta <= 0 || !day) redirect("/koreksi?msg=invalid");

  const [questionRows] = await db.execute(
    "SELECT id,bobot FROM soal WHERE LOWER(TRIM(day))=LOWER(TRIM(?)) ORDER BY no_soal ASC",
    [day],
  );
  const questions = questionRows as Array<{ id: number; bobot: number }>;
  if (!questions.length) redirect(`/koreksi/${idPeserta}?day=${encodeURIComponent(day)}&msg=invalid`);

  const connection = await db.getConnection();
  let saved = 0;
  try {
    await connection.beginTransaction();
    for (const question of questions) {
      const raw = formData.get(`nilai_${question.id}`);
      if (raw === null || String(raw).trim() === "") continue;
      const bobot = Number(question.bobot) || 0;
      const nilai = Math.max(0, Math.min(bobot, Math.round(Number(String(raw).replace(",", ".")) * 100) / 100));
      if (!Number.isFinite(nilai)) continue;
      const catatan = String(formData.get(`catatan_${question.id}`) ?? "").trim().slice(0, 2000);

      const [existing] = await connection.execute(
        "SELECT id FROM jawaban_peserta WHERE id_peserta=? AND id_soal=? ORDER BY id DESC LIMIT 1",
        [idPeserta, question.id],
      );
      if ((existing as unknown[]).length) {
        await connection.execute(
          "UPDATE jawaban_peserta SET nilai=?, catatan_koreksi=?, is_dikoreksi=1, is_koreksi=1 WHERE id=?",
          [nilai, catatan || null, (existing as Array<{ id: number }>)[0].id],
        );
      } else {
        await connection.execute(
          "INSERT INTO jawaban_peserta (id_peserta,id_soal,jawaban,skor_auto,nilai,catatan_koreksi,is_dikoreksi,is_koreksi,created_at) VALUES (?,?,NULL,0,?,?,1,1,NOW())",
          [idPeserta, question.id, nilai, catatan || null],
        );
      }
      saved += 1;
    }
    await connection.commit();
  } catch {
    await connection.rollback();
    redirect(`/koreksi/${idPeserta}?day=${encodeURIComponent(day)}&msg=error`);
  } finally {
    connection.release();
  }

  revalidatePath("/koreksi");
  revalidatePath(`/koreksi/${idPeserta}`);
  revalidatePath("/jawaban-peserta");
  revalidatePath("/rekapitulasi");
  await logAdminActivity({
    action: "score_save",
    session,
    entity: "jawaban_peserta",
    entityId: idPeserta,
    detail: `${saved} nilai ${day} untuk peserta id ${idPeserta} disimpan.`,
  });
  redirect(`/koreksi/${idPeserta}?day=${encodeURIComponent(day)}&msg=${saved ? "saved" : "empty"}`);
}
