import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const form = await request.formData();
  const id = Number(form.get("id_peserta") ?? 0);
  const catatan = String(form.get("catatan") ?? "").trim();
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ success: false, message: "ID peserta tidak valid." });
  if ([...catatan].length > 5000) return NextResponse.json({ success: false, message: "Catatan maksimal 5000 karakter." });
  const [rows] = await db.execute("SELECT id FROM peserta WHERE id = ? LIMIT 1", [id]);
  if (!(rows as unknown[]).length) return NextResponse.json({ success: false, message: "Peserta tidak ditemukan." });
  await db.execute("UPDATE peserta SET catatan = ? WHERE id = ?", [catatan || null, id]);
  return NextResponse.json({ success: true, message: "Catatan berhasil disimpan.", id_peserta: id, catatan });
}
