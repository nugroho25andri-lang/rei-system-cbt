"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Pool, PoolConnection } from "mysql2/promise";
import { logAdminActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { isQuestionDay } from "@/lib/exam-days";
import { parseKeywordText, type KeywordWeight } from "@/lib/keywords";
import { QuestionImageException, removeQuestionImage, storeQuestionImage } from "@/lib/question-image";
import { requireRole } from "@/lib/session";
import { normalizeTableConfig, type TableConfig } from "@/lib/table-question";

const CHOICE_FIELDS = ["pilihan_a", "pilihan_b", "pilihan_c", "pilihan_d"] as const;
type QuestionType = "esai" | "pilihan_ganda" | "upload" | "tabel";
type ExamType = "pretest" | "posttest";

export type BulkState = { ok: boolean; message: string } | null;

async function questionColumn() {
  const [rows] = await db.execute("SELECT column_name AS name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='soal' AND column_name IN ('pertanyaan','pertanyaaan')");
  const columns = (rows as Array<{ name: string }>).map((row) => row.name);
  return columns.includes("pertanyaan") ? "pertanyaan" : "pertanyaaan";
}

type Normalized =
  | { error: "invalid" | "invalid-day" | "invalid-tes" | "pg-lengkap" | "pg-kunci" | "keyword-bobot" | "tabel-kosong" }
  | { error: ""; day: string; jenisTes: ExamType; noSoal: number; pertanyaan: string; keywords: string; keywordList: KeywordWeight[]; bobot: number; waktuSoal: number; jenis: QuestionType; choices: string[]; answerKey: string; tableConfig: TableConfig | null };

function normalizeKeywords(input: Record<string, unknown>, bobot: number): KeywordWeight[] {
  if (Array.isArray(input.keyword_list)) {
    return (input.keyword_list as Array<Record<string, unknown>>)
      .map((item) => ({ kata_kunci: String(item?.kata_kunci ?? "").trim(), bobot: Number(item?.bobot) }))
      .filter((item) => item.kata_kunci)
      .map((item) => ({ kata_kunci: item.kata_kunci, bobot: Number.isFinite(item.bobot) && item.bobot > 0 ? Math.round(item.bobot * 100) / 100 : 1 }));
  }
  return parseKeywordText(String(input.kata_kunci ?? ""), bobot);
}

function normalize(input: Record<string, unknown>, allowLegacyDay5 = false): Normalized {
  const day = String(input.day ?? "").trim() || "Day 1";
  if (!isQuestionDay(day) && !(allowLegacyDay5 && day === "Day 5")) return { error: "invalid-day" };
  const rawExamType = String(input.jenis_tes ?? "posttest").trim();
  if (rawExamType !== "pretest" && rawExamType !== "posttest") return { error: "invalid-tes" };
  const jenisTes: ExamType = rawExamType;
  const noSoal = Math.trunc(Number(input.no_soal));
  const pertanyaan = String(input.pertanyaan ?? "").trim();
  const bobot = Math.trunc(Number(input.bobot));
  const waktuSoal = Math.trunc(Number(input.waktu_soal ?? 0));
  const jenis: QuestionType =
    input.jenis_soal === "pilihan_ganda"
      ? "pilihan_ganda"
      : input.jenis_soal === "upload"
        ? "upload"
        : input.jenis_soal === "tabel"
          ? "tabel"
          : "esai";
  const choices = CHOICE_FIELDS.map((field) => String(input[field] ?? "").trim());
  const answerKey = String(input.jawaban_benar ?? "").trim().toUpperCase();
  const keywordList = (jenis === "esai" || jenis === "tabel") && Number.isFinite(bobot) && bobot > 0 ? normalizeKeywords(input, bobot) : [];
  const tableConfig = jenis === "tabel" ? normalizeTableConfig(input.tabel_config) : null;

  if (!pertanyaan || !Number.isInteger(noSoal) || noSoal <= 0 || !Number.isInteger(bobot) || bobot <= 0) return { error: "invalid" };
  if (!Number.isInteger(waktuSoal) || waktuSoal < 0 || waktuSoal > 86400) return { error: "invalid" };
  if (jenis === "pilihan_ganda" && choices.some((choice) => !choice)) return { error: "pg-lengkap" };
  if (jenis === "pilihan_ganda" && !["A", "B", "C", "D"].includes(answerKey)) return { error: "pg-kunci" };
  if (jenis === "tabel" && !tableConfig) return { error: "tabel-kosong" };
  const keywordTotal = keywordList.reduce((sum, item) => sum + item.bobot, 0);
  if ((jenis === "esai" || jenis === "tabel") && keywordTotal > bobot + 0.001) return { error: "keyword-bobot" };
  const keywords = keywordList.map((item) => item.kata_kunci).join(", ");
  return { error: "", day, jenisTes, noSoal, pertanyaan, keywords, keywordList, bobot, waktuSoal, jenis, choices, answerKey, tableConfig };
}

function inputFromForm(form: FormData): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const field of ["day", "jenis_tes", "no_soal", "pertanyaan", "kata_kunci", "bobot", "waktu_soal", "jenis_soal", "jawaban_benar", "tabel_config", ...CHOICE_FIELDS]) {
    input[field] = form.get(field);
  }
  const names = form.getAll("kata_kunci[]").map((value) => String(value).trim());
  const weights = form.getAll("bobot_kata_kunci[]").map((value) => Number(String(value).replace(",", ".")));
  const pairs = names
    .map((name, index) => ({ kata_kunci: name, bobot: Number.isFinite(weights[index]) && weights[index] > 0 ? weights[index] : 1 }))
    .filter((item) => item.kata_kunci);
  if (pairs.length) input.keyword_list = pairs;
  return input;
}

function params(question: Extract<Normalized, { error: "" }>, gambar: string | null) {
  return [
    question.day,
    question.jenisTes,
    question.noSoal,
    question.pertanyaan,
    question.jenis === "esai" || question.jenis === "tabel" ? question.keywords : "",
    question.bobot,
    question.waktuSoal,
    question.jenis,
    ...(question.jenis === "pilihan_ganda" ? question.choices : [null, null, null, null]),
    question.jenis === "pilihan_ganda" ? question.answerKey : null,
    question.jenis === "tabel" && question.tableConfig ? JSON.stringify(question.tableConfig) : null,
    gambar,
  ];
}

async function replaceKeywords(exec: Pool | PoolConnection, questionId: number, keywords: KeywordWeight[]) {
  await exec.execute("DELETE FROM soal_kata_kunci WHERE id_soal=?", [questionId]);
  for (const keyword of keywords) {
    await exec.execute("INSERT INTO soal_kata_kunci (id_soal,kata_kunci,bobot) VALUES (?,?,?)", [questionId, keyword.kata_kunci, keyword.bobot]);
  }
}

async function readImage(form: FormData): Promise<string | null | "gambar-tipe" | "gambar-ukuran" | "gambar-gagal"> {
  const file = form.get("gambar");
  if (!(file instanceof File) || file.size === 0) return null;
  try {
    return await storeQuestionImage(file);
  } catch (error) {
    return error instanceof QuestionImageException ? error.code : "gambar-gagal";
  }
}

export async function addSoalAction(form: FormData) {
  const session = await requireRole(["superadmin", "admin", "hr_staff"]);
  const question = normalize(inputFromForm(form));
  if (question.error) redirect(`/kelola-soal?msg=${question.error}`);
  const gambar = await readImage(form);
  if (gambar && ["gambar-tipe", "gambar-ukuran", "gambar-gagal"].includes(gambar)) redirect(`/kelola-soal?msg=${gambar}`);
  const column = await questionColumn();
  const [result] = await db.execute(
    `INSERT INTO soal (day,jenis_tes,no_soal,\`${column}\`,kata_kunci,bobot,waktu_soal,jenis_soal,pilihan_a,pilihan_b,pilihan_c,pilihan_d,jawaban_benar,tabel_config,gambar) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    params(question, gambar),
  );
  const insertedId = Number((result as { insertId?: number }).insertId ?? 0);
  if (insertedId > 0 && question.keywordList.length) await replaceKeywords(db, insertedId, question.keywordList);
  await logAdminActivity({
    action: "question_create",
    session,
    entity: "soal",
    entityId: (result as { insertId?: number }).insertId ?? null,
    detail: `${question.jenisTes} · ${question.day} nomor ${question.noSoal}: ${question.pertanyaan}`,
  });
  revalidatePath("/kelola-soal");
  redirect("/kelola-soal?msg=added");
}

export async function updateSoalAction(form: FormData) {
  const session = await requireRole(["superadmin", "admin", "hr_staff"]);
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/kelola-soal?msg=invalid");
  const [existingRows] = await db.execute("SELECT gambar,day FROM soal WHERE id=? LIMIT 1", [id]);
  const existing = (existingRows as Array<{ gambar: string | null; day: string }>)[0];
  if (!existing) redirect("/kelola-soal?msg=invalid");
  const question = normalize(inputFromForm(form), existing.day === "Day 5");
  if (question.error) redirect(`/kelola-soal?msg=${question.error}`);

  const oldImage = existing.gambar;
  const uploaded = await readImage(form);
  if (uploaded && ["gambar-tipe", "gambar-ukuran", "gambar-gagal"].includes(uploaded)) redirect(`/kelola-soal?msg=${uploaded}`);
  const removeImage = String(form.get("hapus_gambar") ?? "") === "1";
  let gambar = oldImage;
  if (uploaded) {
    gambar = uploaded;
    if (oldImage) await removeQuestionImage(oldImage);
  } else if (removeImage) {
    gambar = null;
    if (oldImage) await removeQuestionImage(oldImage);
  }

  const column = await questionColumn();
  await db.execute(
    `UPDATE soal SET day=?,jenis_tes=?,no_soal=?,\`${column}\`=?,kata_kunci=?,bobot=?,waktu_soal=?,jenis_soal=?,pilihan_a=?,pilihan_b=?,pilihan_c=?,pilihan_d=?,jawaban_benar=?,tabel_config=?,gambar=? WHERE id=?`,
    [...params(question, gambar), id],
  );
  await replaceKeywords(db, id, question.keywordList);
  await logAdminActivity({
    action: "question_update",
    session,
    entity: "soal",
    entityId: id,
    detail: `${question.jenisTes} · ${question.day} nomor ${question.noSoal}: ${question.pertanyaan}`,
  });
  revalidatePath("/kelola-soal");
  redirect("/kelola-soal?msg=updated");
}

const bulkErrors: Record<string, string> = {
  invalid: "lengkapi pertanyaan, nomor soal, bobot, dan waktu soal (0–86400 detik).",
  "invalid-day": "soal pretest/posttest hanya tersedia untuk Day 1 sampai Day 4. Day 5 menggunakan penilaian praktik.",
  "invalid-tes": "pilih jenis tes pretest atau posttest.",
  "pg-lengkap": "pilihan A sampai D wajib diisi.",
  "pg-kunci": "kunci jawaban wajib A, B, C, atau D.",
  "keyword-bobot": "total bobot kata kunci tidak boleh melebihi bobot soal.",
  "tabel-kosong": "soal tabel wajib memiliki minimal satu kolom.",
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
      const [inserted] = await connection.execute(
        `INSERT INTO soal (day,jenis_tes,no_soal,\`${column}\`,kata_kunci,bobot,waktu_soal,jenis_soal,pilihan_a,pilihan_b,pilihan_c,pilihan_d,jawaban_benar,tabel_config,gambar) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        params(question, null),
      );
      const keywordQuestionId = Number((inserted as { insertId?: number }).insertId ?? 0);
      if (keywordQuestionId > 0 && question.keywordList.length) await replaceKeywords(connection, keywordQuestionId, question.keywordList);
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
    detail: `${questions.length} soal ${[...new Set(questions.map((question) => question.jenisTes))].join("/")} ditambahkan untuk ${[...new Set(questions.map((question) => question.day))].join(", ")}.`,
  });
  redirect(`/kelola-soal?msg=banyak&count=${questions.length}`);
}

export async function deleteSoalAction(form: FormData) {
  const session = await requireRole(["superadmin", "admin", "hr_staff"]);
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const [rows] = await db.execute("SELECT day,no_soal,pertanyaan,gambar FROM soal WHERE id = ? LIMIT 1", [id]);
  const question = (rows as Array<{ day: string; no_soal: number; pertanyaan: string; gambar: string | null }>)[0];
  await db.execute("DELETE FROM soal_kata_kunci WHERE id_soal = ?", [id]);
  await db.execute("DELETE FROM soal WHERE id = ?", [id]);
  await removeQuestionImage(question?.gambar);
  await logAdminActivity({
    action: "question_delete",
    session,
    entity: "soal",
    entityId: id,
    detail: question ? `${question.day} nomor ${question.no_soal}: ${question.pertanyaan}` : `Soal id ${id} dihapus.`,
  });
  revalidatePath("/kelola-soal");
}
