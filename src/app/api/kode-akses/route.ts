import { NextResponse } from "next/server";
import { getActiveAccessCodes } from "@/lib/access-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const data = await getActiveAccessCodes();
    return NextResponse.json({ status: "success", kode: data.kode, periode_mulai: data.periode_mulai, periode_selesai: data.periode_selesai }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" } });
  } catch (error) {
    return NextResponse.json({ status: "error", message: "Gagal mengambil kode akses dari server.", detail: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
