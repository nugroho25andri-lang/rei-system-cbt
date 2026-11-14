import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/session";

export default async function DetailKoreksiPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ day?: string; jenis_tes?: string }> }) {
  await requireAdminSession();
  const { id } = await params;
  const { day, jenis_tes: jenisTes } = await searchParams;
  const idPeserta = Number(id);
  if (!Number.isInteger(idPeserta) || idPeserta <= 0) redirect("/koreksi");
  const query = new URLSearchParams({ peserta: String(idPeserta) });
  if (day) query.set("day", day);
  if (jenisTes) query.set("jenis_tes", jenisTes);
  redirect(`/koreksi?${query.toString()}`);
}
