import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getEmployeeSession } from "@/lib/employee-session";
import { getEmployeeProgress, getEmployeeQuizzes, getTrainingMaterials } from "@/lib/employee-training";
import TrainingClient from "./training-client";

export const dynamic = "force-dynamic";
export default async function EmployeeDashboardPage() {
  const id = await getEmployeeSession();
  if (!id) redirect("/employe");
  const [participants, materials] = await Promise.all([
    db.execute("SELECT id,nip,nama_peserta,email,jabatan,batch,cabang,penempatan,status FROM peserta WHERE id=? LIMIT 1", [id]),
    getTrainingMaterials(),
  ]);
  const participant = (participants[0] as Array<Record<string, unknown>>)[0];
  if (!participant || (participant.status && String(participant.status).toLowerCase() !== "aktif")) redirect("/api/employee/logout");
  const [training, quizzes] = await Promise.all([getEmployeeProgress(id), getEmployeeQuizzes(materials)]);
  return <main className="employee-dashboard"><header className="employee-top"><div><b>RAJA EMAS INDONESIA</b><h1>CBT PESERTA</h1></div><a href="/api/employee/logout">Keluar</a></header>
    <section className="employee-welcome"><div><small>SELAMAT DATANG</small><h2>{String(participant.nama_peserta ?? "Peserta")}</h2><p>Ikuti materi sesuai urutan. Materi selanjutnya terbuka setelah materi sebelumnya dan quiz selesai.</p></div><span>✓ PESERTA TERVERIFIKASI</span></section>
    <section className="employee-grid"><article className="panel"><h2>Data Peserta</h2>{[["NIP", participant.nip], ["Email", participant.email], ["Jabatan", participant.jabatan], ["Batch", participant.batch], ["Cabang", participant.cabang], ["Penempatan", participant.penempatan]].map(([label, value]) => <div className="profile-row" key={String(label)}><b>{String(label)}</b><span>{String(value ?? "-")}</span></div>)}</article><article className="panel"><h2>Informasi Training</h2><p>REI On Boarding</p><p>Status: {training.trainingSubmitted ? "Training Selesai" : "Selesaikan Materi dan Quiz"}</p></article></section>
    <section className="employee-eval-cta"><div><small>PENILAIAN TRAINER</small><h2>Nilai trainer yang mengajar</h2><p>Isi penilaian setiap hari setelah sesi selesai. Nama penilai disensor dan hanya admin yang dapat melihat identitas lengkap.</p></div><a href="/employe/penilaian-trainer">Isi penilaian trainer</a></section>
    <TrainingClient materials={materials} initialProgress={training.progress} quizzes={quizzes} initialSubmitted={training.trainingSubmitted} />
  </main>;
}
