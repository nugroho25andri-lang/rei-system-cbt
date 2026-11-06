import { NextResponse } from "next/server";
import { logAdminActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
  if (session.role !== "superadmin" && session.role !== "admin") return NextResponse.json({ status: "error", message: "Akun Anda tidak memiliki akses menghapus jawaban." }, { status: 403 });
  const form = await request.formData();
  const nip = String(form.get("nip") ?? "").trim();
  const day = String(form.get("day") ?? "").trim();
  if (!nip || !day) return NextResponse.json({ status: "error", message: "Data NIP atau Day tidak lengkap." });
  const [participants] = await db.execute("SELECT id FROM peserta WHERE nip = ? LIMIT 1", [nip]);
  const participant = (participants as Array<{ id: number }>)[0];
  if (!participant) return NextResponse.json({ status: "error", message: `Peserta dengan NIP '${nip}' tidak ditemukan di database.` });
  const [result] = await db.execute("DELETE jp FROM jawaban_peserta jp JOIN soal s ON jp.id_soal = s.id WHERE jp.id_peserta = ? AND s.day = ?", [participant.id, day]);
  if (!(result as { affectedRows: number }).affectedRows) return NextResponse.json({ status: "error", message: `Tidak ada data jawaban ditemukan untuk NIP '${nip}' pada '${day}'. Pastikan input 'Day' sama persis (contoh: 'Day 1' atau 'Day 2').` });
  await logAdminActivity({
    action: "answer_delete",
    session,
    entity: "jawaban_peserta",
    entityId: participant.id,
    detail: `${(result as { affectedRows: number }).affectedRows} jawaban NIP ${nip} pada ${day} dihapus.`,
  });
  return NextResponse.json({ status: "success", message: "Data berhasil dihapus" });
}
