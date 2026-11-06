"use server";
import { redirect } from "next/navigation";
import { logAdminActivity } from "@/lib/activity";
import { regenerateAccessCodes } from "@/lib/access-codes";
import { requireRole } from "@/lib/session";

export async function regenerateCodesAction() {
  const session = await requireRole(["superadmin", "admin"]);
  const access = await regenerateAccessCodes();
  await logAdminActivity({
    action: "token_regenerate",
    session,
    entity: "tokens",
    detail: `Kode akses baru dibuat untuk periode ${access.periode_mulai} sampai ${access.periode_selesai}.`,
  });
  redirect("/admin?codes=updated");
}
