import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getEmployeeSession } from "@/lib/employee-session";
import { getBatchContext, getParticipantEvaluationHistory } from "@/lib/trainer-evaluation";
import { maskIdentity } from "@/lib/trainer-evaluation-shared";
import TrainerEvaluationForm from "@/components/trainer-evaluation-form";

export const dynamic = "force-dynamic";

export default async function EmployeeTrainerEvaluationPage() {
  const id = await getEmployeeSession();
  if (!id) redirect("/employe");

  const [rows] = await db.execute("SELECT id,nip,nama_peserta,batch,status FROM peserta WHERE id=? LIMIT 1", [id]);
  const participant = (rows as Array<{ id: number; nip: string; nama_peserta: string; batch: string | null; status: string | null }>)[0];
  if (!participant || (participant.status && String(participant.status).toLowerCase() !== "aktif")) redirect("/api/employee/logout");

  const [context, history] = await Promise.all([
    getBatchContext(String(participant.batch ?? "")),
    getParticipantEvaluationHistory(participant.id),
  ]);

  return (
    <main className="employee-dashboard">
      <header className="employee-top">
        <div><b>RAJA EMAS INDONESIA</b><h1>PENILAIAN TRAINER</h1></div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <a href="/employe/dashboard">Materi Training</a>
          <a href="/api/employee/logout">Keluar</a>
        </div>
      </header>

      <section className="employee-welcome">
        <div>
          <small>SELAMAT DATANG</small>
          <h2>{maskIdentity()}</h2>
          <p>Nilai trainer yang mengajar pada setiap hari pelatihan. Pilih trainer, isi hari, tanggal, dan jam mengajar, lalu berikan penilaian 1–5 untuk 10 aspek.</p>
        </div>
        <span>✓ IDENTITAS DISENSOR</span>
      </section>

      {!context.trainers.length && (
        <p role="status" className="notice" style={{ marginBottom: 18 }}>
          Daftar trainer untuk {context.batchLabel} belum tersedia. Silakan hubungi admin.
        </p>
      )}

      <TrainerEvaluationForm
        mode="portal"
        evaluatorLabel={maskIdentity()}
        context={context}
        history={history}
      />
    </main>
  );
}
