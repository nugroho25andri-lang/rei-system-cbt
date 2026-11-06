import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/session";

export default async function DetailKoreksiPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ day?: string }> }) {
  await requireAdminSession();
  const { id } = await params;
  const { day } = await searchParams;
  const idPeserta = Number(id);
  if (!Number.isInteger(idPeserta) || idPeserta <= 0) redirect("/koreksi");
  redirect(`/koreksi?peserta=${idPeserta}${day ? `&day=${encodeURIComponent(day)}` : ""}`);
}
