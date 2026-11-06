"use server";
import { redirect } from "next/navigation";
import { logAdminActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export async function saveDay6Action(form: FormData) {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  const id = Number(form.get("id_peserta"));
  const score = Number(form.get("nilai"));
  const note = String(form.get("catatan") ?? "").trim();
  if (!Number.isInteger(id) || id <= 0) redirect("/test-day6?error=participant");
  if (!Number.isInteger(score) || score < 0 || score > 180) redirect("/test-day6?error=score");
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [participantRows] = await connection.execute("SELECT id FROM peserta WHERE id=? LIMIT 1", [id]);
    if (!(participantRows as unknown[]).length) throw new Error("Peserta tidak ditemukan.");
    const [oldRows] = await connection.execute("SELECT id FROM penilaian_day6 WHERE id_peserta=? LIMIT 1", [id]);
    if ((oldRows as unknown[]).length) {
      await connection.execute("UPDATE penilaian_day6 SET nilai=?,catatan=?,nilai_akhir=?,updated_at=NOW() WHERE id_peserta=?", [score,note,score,id]);
    } else {
      await connection.execute("INSERT INTO penilaian_day6 (id_peserta,nilai,catatan,nilai_akhir,created_at,updated_at) VALUES (?,?,?,?,NOW(),NOW())", [id,score,note,score]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    redirect(`/test-day6?error=${encodeURIComponent(error instanceof Error ? error.message : "save")}`);
  } finally { connection.release(); }
  await logAdminActivity({
    action: "day6_save",
    session,
    entity: "penilaian_day6",
    entityId: id,
    detail: `Nilai Day 6 peserta id ${id} disimpan: ${score}.`,
  });
  redirect("/test-day6?saved=1");
}
