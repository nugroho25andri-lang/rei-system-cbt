"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEmployeeSession } from "@/lib/employee-session";
import { getAccessCodeBatch, getBatchContext, insertTrainerEvaluation } from "@/lib/trainer-evaluation";
import {
  TRAINER_CRITERIA,
  normalizeBatch,
  todayJakarta,
  type EvaluationFormState,
  type TrainerCriterionKey,
} from "@/lib/trainer-evaluation-shared";

function fail(error: string): EvaluationFormState {
  return { ok: false, error };
}

export async function submitTrainerEvaluationAction(_prevState: EvaluationFormState, formData: FormData): Promise<EvaluationFormState> {
  try {
    const mode = String(formData.get("mode") ?? "portal").trim() === "kode" ? "kode" : "portal";
    let participantId = 0;
    let expectedBatch = "";

    if (mode === "portal") {
      const sessionId = await getEmployeeSession();
      if (!sessionId) return fail("Sesi peserta tidak ditemukan. Silakan login kembali.");
      participantId = sessionId;
    } else {
      const code = String(formData.get("kode_akses") ?? "").trim();
      const nip = String(formData.get("nip") ?? "").trim();
      if (!code) return fail("Kode akses wajib diisi.");
      if (!nip) return fail("NIP wajib diisi.");
      const batch = await getAccessCodeBatch(code);
      if (!batch) return fail("Kode akses tidak valid atau sudah tidak aktif.");
      expectedBatch = batch.label;
      const [rows] = await db.execute("SELECT id,batch FROM peserta WHERE nip=? LIMIT 1", [nip]);
      const participant = (rows as Array<{ id: number; batch: string | null }>)[0];
      if (!participant) return fail("NIP peserta tidak ditemukan.");
      if (normalizeBatch(String(participant.batch ?? "")) !== normalizeBatch(expectedBatch)) {
        return fail(`NIP tersebut tidak terdaftar pada ${batch.label}.`);
      }
      participantId = Number(participant.id);
    }

    const [participantRows] = await db.execute("SELECT id,nip,nama_peserta,batch,status FROM peserta WHERE id=? LIMIT 1", [participantId]);
    const participant = (participantRows as Array<{ id: number; nip: string; nama_peserta: string; batch: string | null; status: string | null }>)[0];
    if (!participant) return fail("Data peserta tidak ditemukan.");
    if (participant.status && String(participant.status).toLowerCase() !== "aktif") {
      return fail("Status peserta tidak aktif. Hubungi admin untuk informasi lebih lanjut.");
    }
    if (expectedBatch && normalizeBatch(String(participant.batch ?? "")) !== normalizeBatch(expectedBatch)) {
      return fail(`Peserta tidak terdaftar pada ${expectedBatch}.`);
    }

    const batch = String(participant.batch ?? "").trim();
    const context = await getBatchContext(batch);
    if (!context.trainers.length) return fail("Daftar trainer untuk batch Anda belum tersedia. Hubungi admin.");

    const trainerInput = String(formData.get("trainer") ?? "").trim();
    if (!trainerInput) return fail("Pilih nama trainer terlebih dahulu.");
    const trainer = context.trainers.find((entry) => entry.toLowerCase() === trainerInput.toLowerCase());
    if (!trainer) return fail("Nama trainer tidak sesuai dengan jadwal batch Anda.");

    const dayKe = Number(formData.get("day_ke"));
    if (!Number.isInteger(dayKe) || dayKe <= 0 || !context.days.some((day) => day.dayKe === dayKe)) {
      return fail("Pilih hari ke berapa trainer mengajar.");
    }

    const tanggal = String(formData.get("tanggal") ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return fail("Tanggal mengajar wajib diisi.");
    if (tanggal > todayJakarta()) return fail("Tanggal mengajar tidak boleh melebihi hari ini.");

    const jamMulai = String(formData.get("jam_mulai") ?? "").trim();
    const jamSelesai = String(formData.get("jam_selesai") ?? "").trim();
    if (!/^\d{2}:\d{2}$/.test(jamMulai) || !/^\d{2}:\d{2}$/.test(jamSelesai)) return fail("Jam mulai dan jam selesai wajib diisi.");
    if (jamSelesai <= jamMulai) return fail("Jam selesai harus lebih besar dari jam mulai.");

    const scores = {} as Record<TrainerCriterionKey, number>;
    for (const criterion of TRAINER_CRITERIA) {
      const value = Number(formData.get(criterion.key));
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        return fail(`Nilai untuk "${criterion.label}" wajib dipilih (skala 1–5).`);
      }
      scores[criterion.key] = value;
    }

    const halTerbaik = String(formData.get("hal_terbaik") ?? "").trim().slice(0, 2000);
    const perbaikan = String(formData.get("perbaikan") ?? "").trim().slice(0, 2000);

    const result = await insertTrainerEvaluation({
      pesertaId: participant.id,
      nip: String(participant.nip ?? ""),
      namaPeserta: String(participant.nama_peserta ?? ""),
      batch,
      trainer,
      dayKe,
      tanggal,
      jamMulai,
      jamSelesai,
      scores,
      halTerbaik,
      perbaikan,
      sumber: mode,
    });

    if (!result.ok) {
      return fail(`Penilaian untuk ${trainer} pada tanggal tersebut sudah pernah dikirim. Hubungi admin bila perlu diperbaiki.`);
    }

    revalidatePath("/analisis-trainer");
    return { ok: true, success: `Terima kasih. Penilaian untuk ${trainer} berhasil dikirim.` };
  } catch (error) {
    console.error("submitTrainerEvaluationAction", error);
    return fail("Penilaian gagal disimpan. Silakan coba lagi atau hubungi admin.");
  }
}
