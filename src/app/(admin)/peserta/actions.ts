"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

async function requireAdmin() { return requireRole(["superadmin", "admin"]); }
function fields(form: FormData) {
  return [String(form.get("nip") ?? "").trim(), String(form.get("nama_peserta") ?? "").trim(), String(form.get("jabatan") ?? "").trim(), Number(form.get("batch") ?? 0), String(form.get("cabang") ?? "").trim(), String(form.get("penempatan") ?? "").trim()] as const;
}
export async function savePesertaAction(form: FormData) {
  const session = await requireAdmin();
  const returnTo = form.get("return_to") === "dashboard" ? "/admin" : "/peserta";
  const [nip, nama, jabatan, batch, cabang, penempatan] = fields(form);
  if (!nip || !nama || !Number.isFinite(batch)) redirect(`${returnTo}?msg=invalid`);
  if (form.get("action") === "edit") {
    const id = Number(form.get("id"));
    await db.execute("UPDATE peserta SET nip=?, nama_peserta=?, jabatan=?, batch=?, cabang=?, penempatan=? WHERE id=?", [nip, nama, jabatan, batch, cabang, penempatan, id]);
    await logAdminActivity({
      action: "participant_update",
      session,
      entity: "peserta",
      entityId: id,
      detail: `Peserta ${nama} (NIP ${nip}) diperbarui.`,
    });
    revalidatePath("/admin");
    redirect(`${returnTo}?msg=updated`);
  }
  const [result] = await db.execute("INSERT INTO peserta (nip,nama_peserta,jabatan,batch,cabang,penempatan) VALUES (?,?,?,?,?,?)", [nip, nama, jabatan, batch, cabang, penempatan]);
  await logAdminActivity({
    action: "participant_create",
    session,
    entity: "peserta",
    entityId: (result as { insertId?: number }).insertId ?? null,
    detail: `Peserta ${nama} (NIP ${nip}) ditambahkan.`,
  });
  revalidatePath("/admin");
  redirect(`${returnTo}?msg=added`);
}
export async function deletePesertaAction(form: FormData) {
  const session = await requireAdmin();
  const id = Number(form.get("id"));
  const [rows] = await db.execute("SELECT nama_peserta,nip FROM peserta WHERE id=? LIMIT 1", [id]);
  const participant = (rows as Array<{ nama_peserta: string; nip: string }>)[0];
  await db.execute("DELETE FROM peserta WHERE id=?", [id]);
  await logAdminActivity({
    action: "participant_delete",
    session,
    entity: "peserta",
    entityId: id,
    detail: participant ? `Peserta ${participant.nama_peserta} (NIP ${participant.nip}) dihapus.` : `Peserta id ${id} dihapus.`,
  });
  revalidatePath("/peserta");
  revalidatePath("/admin");
  if (form.get("return_to") === "dashboard") redirect("/admin?msg=deleted");
}
function parseCsvLine(line: string) {
  const values: string[] = []; let value = ""; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { values.push(value); value = ""; }
    else value += char;
  }
  values.push(value); return values;
}
export async function importPesertaAction(form: FormData) {
  const session = await requireAdmin();
  const file = form.get("file_excel");
  if (!(file instanceof File) || file.size === 0) redirect("/peserta?msg=invalid");
  const lines = (await file.text()).replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  const connection = await db.getConnection();
  let imported = 0;
  try {
    await connection.beginTransaction();
    for (const line of lines.slice(1)) {
      const row = parseCsvLine(line);
      if (row.length < 6) continue;
      await connection.execute("INSERT INTO peserta (nip,nama_peserta,jabatan,batch,cabang,penempatan) VALUES (?,?,?,?,?,?)", row.slice(0, 6));
      imported++;
    }
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  await logAdminActivity({
    action: "participant_import",
    session,
    entity: "peserta",
    detail: `${imported} peserta diimpor dari file ${file.name}.`,
  });
  redirect(`/peserta?msg=imported&count=${imported}`);
}
