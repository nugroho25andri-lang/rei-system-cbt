import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!await getAdminSession()) return NextResponse.json({ success: false, message: "Unauthorized" });
  const id = Number(new URL(request.url).searchParams.get("id_peserta") ?? 0);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ success: false, message: "ID peserta tidak valid" });
  const [rows] = await db.execute("SELECT id, attitude, antusiasme, disiplin, loyalitas, total_manual, catatan FROM penilaian_manual WHERE id_peserta = ? ORDER BY id DESC", [id]);
  return NextResponse.json({ success: true, data: rows });
}
