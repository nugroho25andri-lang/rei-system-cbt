import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import AADLForm from "./aadl-form";

export const dynamic = "force-dynamic";
export default async function InputNilaiPage({ searchParams }: { searchParams: Promise<{ batch?: string; saved?: string; error?: string }> }) {
  if (!await getAdminSession()) redirect("/login");
  const { batch = "", saved, error } = await searchParams;
  const [columnsResult] = await db.execute("SELECT column_name AS name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='peserta'");
  const columns = new Set((columnsResult as Array<{ name: string }>).map((row) => row.name));
  const nameColumn = ["nama_peserta", "nama", "nama_lengkap"].find((column) => columns.has(column)) ?? "nama_peserta";
  const nipColumn = ["nip", "nomor_ujian", "username"].find((column) => columns.has(column)) ?? "nip";
  const batchColumn = ["batch", "batch_training", "batch_id"].find((column) => columns.has(column));
  const sql = `SELECT id,\`${nameColumn}\` AS nama_peserta,\`${nipColumn}\` AS nip,${batchColumn ? `\`${batchColumn}\`` : "''"} AS batch FROM peserta ${batch && batchColumn ? `WHERE \`${batchColumn}\`=?` : ""} ORDER BY \`${nameColumn}\` ASC`;
  const [rows] = await db.execute(sql, batch && batchColumn ? [batch] : []);
  return <AADLForm participants={rows as Array<{ id: number; nama_peserta: string; nip: string; batch: string }>} batch={batch} saved={saved === "1"} error={error} />;
}
