"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

const CHOICE_FIELDS = ["pilihan_a", "pilihan_b", "pilihan_c", "pilihan_d"] as const;

export type BulkState = { ok: boolean; message: string } | null;

async function questionColumn() {
  const [rows] = await db.execute("SELECT column_name AS name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='soal' AND column_name IN ('pertanyaan','pertanyaaan')");
  const columns = (rows as Array<{ name: string }>).map((row) => row.name);
  return columns.includes("pertanyaan") ? "pertanyaan" : "pertanyaaan";
}

type Normalized =
  | { error: "invalid" | "pg-lengkap" | "pg-kunci" }
  | { error: ""; day: string; noSoal: number; pertanyaan: string; keywords: string; bobot: number; waktuSoal: number; jenis: "esai" | "pilihan_ganda"; choices: string[]; answerKey: string };

function normalize(input: Record<string, unknown>): Normalized {
  const day = String(input.day ?? "").trim() || "Day 1";
  const noSoal = Math.trunc(Number(input.no_soal));
  const pertanyaan = String(input.pertanyaan ?? "").trim();
  const keywords = String(input.kata_kunci ?? "").trim();
  const bobot = Math.trunc(Number(input.bobot));
  const waktuSoal = Math.trunc(Number(input.waktu_soal ?? 0));
  const jenis = input.jenis_soal === "pilihan_ganda" ? "pilihan_ganda" as const : "esai" as const;
  const choices = CHOICE_FIELDS.map((field) => String(input[field] ?? "").trim());
  const answerKey = String(input.jawaban_benar ?? "").trim().toUpperCase();

  if (!pertanyaan || !Number.isInteger(noSoal) || noSoal <= 0 || !Number.isInteger(bobot) || bobot <= 0) return { error: "invalid" };
  if (!Number.isInteger(waktuSoal) || waktuSoal < 0 || waktuSoal > 86400) return { error: "invalid" };
  if (jenis === "pilihan_ganda" && choices.some((choice) => !choice)) return { error: "pg-lengkap" };
  if (jenis === "pilihan_ganda" && !["A", "B", "C", "D"].includes(answerKey)) return { error: "pg-kunci" };
  return { error: "", day, noSoal, pertanyaan, keywords, bobot, waktuSoal, jenis, choices, answerKey };
}

function inputFromForm(form: FormData): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const field of ["day", "no_soal", "pertanyaan", "kata_kunci", "bobot", "waktu_soal", "jenis_soal", "jawaban_benar", ...CHOICE_FIELDS]) {
    input[field] = form.get(field);
  }
  return input;
}

function params(question: Extract<Normalized, { error: "" }>) {
  return [
    question.day,
    question.noSoal,
    question.pertanyaan,
    question.jenis === "pilihan_ganda" ? "" : question.keywords,
    question.bobot,
    question.waktuSoal,
    question.jenis,
    ...(question.jenis === "pilihan_ganda" ? question.choices : [null, null, null, null]),
    question.jenis === "pilihan_ganda" ? question.answerKey : null,
  ];
}

export async function addSoalAction(form: FormData) {
  const session = await requireRole(["superadmin", "admin", "hr_staff"]);
  const question = normalize(inputFromForm(form));
  if (question.error) redirect(`/kelola-soal?msg=${question.error}`);
  const column = await questionColumn();
  const [result] = await db.execute(
    `INSERT INTO soal (day,no_soal,\`${column}\`,kata_kunci,bobot,waktu_soal,jenis_soal,pilihan_a,pilihan_b,pilihan_c,pilihan_d,jawaban_benar) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    params(question),
  );
  await logAdminActivity({
    action: "question_create",
    session,
    entity: "soal",
    entityId: (result as { insertId?: number }).insertId ?? null,
    detail: `${question.day} nomor ${question.noSoal}: ${question.pertanyaan}`,
  });
  revalidatePath("/kelola-soal");
  redirect("/kelola-soal?msg=added");
}

export async function updateSoalAction(form: FormData) {
  const session = await requireRole(["superadmin", "admin", "hr_staff"]);
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/kelola-soal?msg=invalid");
  const question = normalize(inputFromForm(form));
  if (question.error) redirect(`/kelola-soal?msg=${question.error}`);
  const column = await questionColumn();
  await db.execute(
    `UPDATE soal SET day=?,no_soal=?,\`${column}\`=?,kata_kunci=?,bobot=?,waktu_soal=?,jenis_soal=?,pilihan_a=?,pilihan_b=?,pilihan_c=?,pilihan_d=?,jawaban_benar=? WHERE id=?`,
    [...params(question), id],
  );
  await logAdminActivity({
    action: "question_update",
    session,
    entity: "soal",
    entityId: id,
    detail: `${question.day} nomor ${question.noSoal}: ${question.pertanyaan}`,
  });
  revalidatePath("/kelola-soal");
  redirect("/kelola-soal?msg=updated");
}

const bulkErrors: Record<string, string> = {
  invalid: "lengkapi pertanyaan, nomor soal, bobot, dan waktu soal (0–86400 detik).",
  "pg-lengkap": "pilihan A sampai D wajib diisi.",
  "pg-kunci": "kunci jawaban wajib A, B, C, atau D.",
};

export async function addManySoalAction(_previous: BulkState, form: FormData): Promise<BulkState> {
  const session = await requireRole(["superadmin", "admin", "hr_staff"]);

  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("payload") ?? "[]"));
  } catch {
    return { ok: false, message: "Format data soal tidak valid." };
  }
  if (!Array.isArray(raw) || !raw.length) return { ok: false, message: "Isi minimal satu soal." };
  if (raw.length > 100) return { ok: false, message: "Maksimal 100 soal dalam sekali simpan." };

  const questions: Array<Extract<Normalized, { error: "" }>> = [];
  for (let index = 0; index < raw.length; index += 1) {
    const parsed = normalize((raw[index] ?? {}) as Record<string, unknown>);
    if (parsed.error) return { ok: false, message: `Soal ${index + 1}: ${bulkErrors[parsed.error]}` };
    questions.push(parsed);
  }

  const column = await questionColumn();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const question of questions) {
      await connection.execute(
        `INSERT INTO soal (day,no_soal,\`${column}\`,kata_kunci,bobot,waktu_soal,jenis_soal,pilihan_a,pilihan_b,pilihan_c,pilihan_d,jawaban_benar) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        params(question),
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    return { ok: false, message: error instanceof Error ? error.message : "Gagal menyimpan soal." };
  } finally {
    connection.release();
  }

  revalidatePath("/kelola-soal");
  await logAdminActivity({
    action: "question_bulk",
    session,
    entity: "soal",
    detail: `${questions.length} soal ditambahkan untuk ${[...new Set(questions.map((question) => question.day))].join(", ")}.`,
  });
  redirect(`/kelola-soal?msg=banyak&count=${questions.length}`);
}

export async function deleteSoalAction(form: FormData) {
  const session = await requireRole(["superadmin", "admin", "hr_staff"]);
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const [rows] = await db.execute("SELECT day,no_soal,pertanyaan FROM soal WHERE id = ? LIMIT 1", [id]);
  const question = (rows as Array<{ day: string; no_soal: number; pertanyaan: string }>)[0];
  await db.execute("DELETE FROM soal WHERE id = ?", [id]);
  await logAdminActivity({
    action: "question_delete",
    session,
    entity: "soal",
    entityId: id,
    detail: question ? `${question.day} nomor ${question.no_soal}: ${question.pertanyaan}` : `Soal id ${id} dihapus.`,
  });
  revalidatePath("/kelola-soal");
}
