import { existsSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/lib/db";

export type Material = { id: number; number: number; title: string; type: "video" | "ppt"; src: string; embed: string; mime: string; ppt: string };
export async function ensureTrainingTables() {
  await db.execute(`CREATE TABLE IF NOT EXISTS progres_materi_peserta (
    id INT AUTO_INCREMENT PRIMARY KEY,peserta_id INT NOT NULL,materi_id INT NOT NULL,materi_type ENUM('video','ppt') NOT NULL,
    progress_seconds DECIMAL(12,3) NOT NULL DEFAULT 0,duration_seconds DECIMAL(12,3) NOT NULL DEFAULT 0,
    progress_percent DECIMAL(6,2) NOT NULL DEFAULT 0,last_page INT NOT NULL DEFAULT 0,total_pages INT NOT NULL DEFAULT 0,
    materi_selesai TINYINT(1) NOT NULL DEFAULT 0,materi_selesai_at DATETIME NULL,quiz_selesai TINYINT(1) NOT NULL DEFAULT 0,
    quiz_selesai_at DATETIME NULL,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_peserta_materi(peserta_id,materi_id),KEY idx_peserta(peserta_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.execute(`CREATE TABLE IF NOT EXISTS status_training_peserta (
    peserta_id INT PRIMARY KEY,training_submitted TINYINT(1) NOT NULL DEFAULT 0,training_submitted_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
async function columns(table: string) {
  const [rows] = await db.execute("SELECT column_name AS name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?", [table]);
  return new Set((rows as Array<{ name: string }>).map((row) => row.name.toLowerCase()));
}
export async function getTrainingMaterials(): Promise<Material[]> {
  const cols = await columns("video_pelatihan");
  if (!cols.size) return [];
  const select = ["id", "judul", "deskripsi", "url_video", "video_url", "file_video", "file_ppt", "day", "nomor_video", "jenis_materi"].filter((name) => cols.has(name));
  const order = cols.has("day") ? "ORDER BY CAST(day AS UNSIGNED),id" : cols.has("nomor_video") ? "ORDER BY nomor_video,id" : "ORDER BY id";
  const [rows] = await db.execute(`SELECT ${select.map((name) => `\`${name}\``).join(",")} FROM video_pelatihan ${order}`);
  const materials: Material[] = [];
  for (const [index, row] of (rows as Array<Record<string, unknown>>).entries()) {
    const type = String(row.jenis_materi ?? "video").trim().toLowerCase() === "ppt" ? "ppt" : "video";
    const fileVideo = String(row.file_video ?? "").trim();
    const external = String(row.url_video ?? row.video_url ?? "").trim();
    let src = ""; let embed = ""; let ppt = "";
    if (type === "ppt") {
      const file = String(row.file_ppt ?? "").replaceAll("\\", "/").split("/").pop() ?? "";
      if (file) ppt = `/uploads/ppt/${encodeURIComponent(file)}`;
    } else if (/^https?:\/\//i.test(fileVideo)) src = fileVideo;
    else if (fileVideo) {
      const file = fileVideo.replaceAll("\\", "/").split("/").pop() ?? "";
      const legacy = existsSync(join(process.cwd(), "upload", "videos", file));
      src = `${legacy ? "/upload/videos" : "/uploads/videos"}/${encodeURIComponent(file)}`;
    }
    if (type === "video" && !src && external) {
      const youtube = external.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
      const vimeo = external.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
      if (youtube) embed = `https://www.youtube.com/embed/${youtube[1]}?rel=0`;
      else if (vimeo) embed = `https://player.vimeo.com/video/${vimeo[1]}`;
      else src = external;
    }
    const id = Number(row.id);
    materials.push({ id, number: index + 1, title: String(row.judul ?? "").trim() || `${type === "ppt" ? "PPT" : "Video"} ${index + 1}`, type, src, embed, mime: "video/mp4", ppt });
  }
  return materials;
}
export async function getEmployeeProgress(participantId: number) {
  await ensureTrainingTables();
  const [progressRows, statusRows] = await Promise.all([
    db.execute("SELECT materi_id,materi_type,progress_seconds,duration_seconds,progress_percent,last_page,total_pages,materi_selesai,quiz_selesai,materi_selesai_at,quiz_selesai_at FROM progres_materi_peserta WHERE peserta_id=? ORDER BY materi_id", [participantId]),
    db.execute("SELECT training_submitted,training_submitted_at FROM status_training_peserta WHERE peserta_id=? LIMIT 1", [participantId]),
  ]);
  const progress = Object.fromEntries((progressRows[0] as Array<Record<string, unknown>>).map((row) => [Number(row.materi_id), { type: row.materi_type, progress_seconds: Number(row.progress_seconds), duration_seconds: Number(row.duration_seconds), progress_percent: Number(row.progress_percent), last_page: Number(row.last_page), total_pages: Number(row.total_pages), materi_selesai: Number(row.materi_selesai) === 1, quiz_selesai: Number(row.quiz_selesai) === 1, materi_selesai_at: row.materi_selesai_at, quiz_selesai_at: row.quiz_selesai_at }]));
  const status = (statusRows[0] as Array<{ training_submitted: number; training_submitted_at: string }>)[0];
  return { progress, trainingSubmitted: Number(status?.training_submitted ?? 0) === 1, trainingSubmittedAt: status?.training_submitted_at ?? null };
}
export async function getEmployeeQuizzes(materials: Material[]) {
  const [tableRows] = await db.execute("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='quiz_berfore_training_questions'");
  if (!Number((tableRows as Array<{ n: number }>)[0]?.n ?? 0)) return {} as Record<number, Array<Record<string, unknown>>>;
  const [rows] = await db.execute("SELECT id,video_slot,nomor_soal,pertanyaan,pilihan_a,pilihan_b,pilihan_c,pilihan_d,bobot FROM quiz_berfore_training_questions ORDER BY video_slot,nomor_soal");
  const byNumber: Record<number, Array<Record<string, unknown>>> = {};
  for (const row of rows as Array<Record<string, unknown>>) {
    const match = String(row.video_slot ?? "").match(/(\d+)/);
    if (!match) continue;
    const number = Number(match[1]);
    (byNumber[number] ??= []).push({ ...row, bobot: Math.max(1, Number(row.bobot) || 1) });
  }
  return Object.fromEntries(materials.flatMap((material) => byNumber[material.number] ? [[material.id, byNumber[material.number]]] : [])) as Record<number, Array<Record<string, unknown>>>;
}
