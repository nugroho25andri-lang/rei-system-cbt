"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

export async function saveKkmAction(formData: FormData) {
  const session = await requireRole(["superadmin", "admin"]);
  const value = Number(formData.get("nilai_kkm"));
  if (!Number.isInteger(value) || value < 0 || value > 10000) redirect("/admin?msg=kkm-invalid");

  const [rows] = await db.execute("SELECT id FROM kkm ORDER BY id LIMIT 1");
  const existing = (rows as Array<{ id: number }>)[0];
  if (existing) await db.execute("UPDATE kkm SET nilai_kkm=? WHERE id=?", [value, existing.id]);
  else await db.execute("INSERT INTO kkm (nilai_kkm) VALUES (?)", [value]);

  await logAdminActivity({
    action: "kkm_update",
    session,
    entity: "kkm",
    entityId: existing?.id ?? null,
    detail: `Standar KKM diubah menjadi ${value}.`,
  });

  revalidatePath("/admin");
  revalidatePath("/rekapitulasi");
  revalidatePath("/peserta");
  revalidatePath("/kelola-soal");
  redirect("/admin?msg=kkm-saved");
}
