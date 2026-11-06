import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { redirectTo } from "@/lib/redirect";

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return redirectTo(request, "/login");
  if (session.role !== "superadmin" && session.role !== "admin") return redirectTo(request, "/admin?denied=1");
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const [rows] = await db.execute("SELECT nip,nama_peserta,jabatan,batch,cabang,penempatan FROM peserta WHERE nama_peserta LIKE ? OR nip LIKE ? ORDER BY id DESC", [`%${q}%`, `%${q}%`]);
  const data = rows as Array<Record<string, unknown>>;
  const csv = [["NIP", "Nama", "Jabatan", "Batch", "Cabang", "Penempatan"], ...data.map((row) => [row.nip, row.nama_peserta, row.jabatan, row.batch, row.cabang, row.penempatan])].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="data_peserta_${new Date().toISOString().slice(0, 10)}.csv"` } });
}
