"use server";
import { redirect } from "next/navigation";
import { logAdminActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export async function saveAADLAction(form: FormData) {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  const id = Number(form.get("id_peserta") ?? 0);
  if (!Number.isInteger(id) || id <= 0) redirect("/input-nilai?error=participant");
  const scores = ["A", "B", "C", "D"].flatMap((category) => form.getAll(`n_${category}[]`).map((value) => Number(value)));
  if (scores.length !== 20 || scores.some((score) => !Number.isFinite(score) || score < 1 || score > 5)) redirect("/input-nilai?error=score");
  const grandTotal = scores.reduce((sum, score) => sum + score, 0);
  const note = String(form.get("catatan") ?? "").trim();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [participants] = await connection.execute("SELECT id FROM peserta WHERE id=? LIMIT 1", [id]);
    if (!(participants as unknown[]).length) throw new Error("Peserta tidak ditemukan.");
    const [rows] = await connection.execute("SELECT id FROM penilaian_manual WHERE id_peserta=? LIMIT 1", [id]);
    const existingId = (rows as Array<{ id: string | number }>)[0]?.id;
    if (existingId !== undefined) {
      await connection.execute("UPDATE penilaian_manual SET total_manual=?,catatan=? WHERE id=?", [grandTotal,note,existingId]);
    } else {
      const [columns] = await connection.execute("SELECT COLUMN_TYPE,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='penilaian_manual' AND COLUMN_NAME='id' LIMIT 1");
      const idInfo = (columns as Array<{ COLUMN_TYPE: string; EXTRA: string }>)[0];
      if (!idInfo) throw new Error("Kolom id pada tabel penilaian_manual tidak ditemukan.");
      if (idInfo.EXTRA.toLowerCase().includes("auto_increment")) {
        await connection.execute("INSERT INTO penilaian_manual (id_peserta,total_manual,catatan) VALUES (?,?,?)", [id,grandTotal,note]);
      } else {
        const idType = idInfo.COLUMN_TYPE.toLowerCase();
        const nextId = idType.includes("int") || idType.includes("decimal")
          ? Number(((await connection.execute("SELECT COALESCE(MAX(id),0)+1 next_id FROM penilaian_manual"))[0] as Array<{ next_id: number }>)[0]?.next_id ?? 1)
          : `PM_${crypto.randomUUID()}`;
        await connection.execute("INSERT INTO penilaian_manual (id,id_peserta,total_manual,catatan) VALUES (?,?,?,?)", [nextId,id,grandTotal,note]);
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    redirect(`/input-nilai?error=${encodeURIComponent(error instanceof Error ? error.message : "save")}`);
  } finally { connection.release(); }
  await logAdminActivity({
    action: "aadl_save",
    session,
    entity: "penilaian_manual",
    entityId: id,
    detail: `Nilai AADL peserta id ${id} disimpan dengan total ${grandTotal}.`,
  });
  redirect("/input-nilai?saved=1");
}
