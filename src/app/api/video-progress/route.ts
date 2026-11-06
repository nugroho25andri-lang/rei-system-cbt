import { NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Video = { video_number: number; nomor_video: number; judul: string; file_video: string; video_url: string };
async function tableExists(name: string) {
  const [rows] = await db.execute("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?", [name]);
  return Number((rows as Array<{ n: number }>)[0]?.n ?? 0) > 0;
}
export async function GET(request: Request) {
  if (!await getAdminSession()) return NextResponse.json({ success: false, message: "Sesi admin tidak valid. Silakan login kembali." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const id = Number(new URL(request.url).searchParams.get("id_peserta") ?? 0);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ success: false, message: "ID peserta tidak valid." }, { status: 400 });
  await db.execute(`CREATE TABLE IF NOT EXISTS progres_peserta (
    id INT AUTO_INCREMENT PRIMARY KEY, peserta_id INT NOT NULL, video_number INT NOT NULL,
    progress_seconds DECIMAL(12,3) NOT NULL DEFAULT 0, duration_seconds DECIMAL(12,3) NOT NULL DEFAULT 0,
    progress_percent DECIMAL(6,2) NOT NULL DEFAULT 0, video_selesai TINYINT(1) NOT NULL DEFAULT 0,
    video_selesai_at DATETIME NULL, quiz_selesai TINYINT(1) NOT NULL DEFAULT 0, quiz_selesai_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_peserta_video (peserta_id, video_number), KEY idx_peserta (peserta_id), KEY idx_video (video_number)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [participantRows] = await db.execute("SELECT id,nip,nama_peserta,email,jabatan,batch,cabang,penempatan FROM peserta WHERE id = ? LIMIT 1", [id]);
  const participant = (participantRows as Array<Record<string, unknown>>)[0];
  if (!participant) return NextResponse.json({ success: false, message: "Peserta tidak ditemukan." }, { status: 404 });
  const videos: Video[] = [];
  if (await tableExists("video_pelatihan")) {
    const [rows] = await db.execute("SELECT nomor_video,judul,file_video,video_url FROM video_pelatihan ORDER BY nomor_video ASC");
    for (const row of rows as Array<Record<string, unknown>>) {
      const n = Number(row.nomor_video);
      videos.push({ video_number: n, nomor_video: n, judul: String(row.judul ?? `Video ${n}`), file_video: String(row.file_video ?? ""), video_url: String(row.video_url ?? "") });
    }
  }
  if (!videos.length) {
    try {
      const directory = join(process.cwd(), "assets", "video");
      for (const file of await readdir(directory)) {
        if (!file.toLowerCase().endsWith(".mp4") || !(await stat(join(directory, file))).isFile()) continue;
        const parsed = file.match(/(\d+)/);
        const n = parsed ? Number(parsed[1]) : videos.length + 1;
        videos.push({ video_number: n, nomor_video: n, judul: `Video ${n}`, file_video: file, video_url: `assets/video/${encodeURIComponent(file)}` });
      }
      videos.sort((a, b) => a.video_number - b.video_number);
    } catch { /* No local video folder; return an empty list, like the PHP fallback. */ }
  }
  const [progressRows] = await db.execute("SELECT video_number,progress_seconds,duration_seconds,progress_percent,video_selesai,video_selesai_at,quiz_selesai,quiz_selesai_at,updated_at FROM progres_peserta WHERE peserta_id = ? ORDER BY video_number ASC", [id]);
  const progress = new Map((progressRows as Array<Record<string, unknown>>).map((row) => [Number(row.video_number), row]));
  let trainingSubmitted = false; let trainingSubmittedAt: unknown = null;
  if (await tableExists("status_training_peserta")) {
    const [rows] = await db.execute("SELECT training_submitted,training_submitted_at FROM status_training_peserta WHERE peserta_id = ? LIMIT 1", [id]);
    const row = (rows as Array<Record<string, unknown>>)[0];
    trainingSubmitted = Number(row?.training_submitted ?? 0) === 1;
    trainingSubmittedAt = row?.training_submitted_at ?? null;
  }
  const quizVideos = new Map<number, number>();
  if (await tableExists("quiz_video_questions")) {
    const [rows] = await db.execute("SELECT video_number,COUNT(*) AS jumlah FROM quiz_video_questions GROUP BY video_number");
    for (const row of rows as Array<{ video_number: number; jumlah: number }>) quizVideos.set(Number(row.video_number), Number(row.jumlah));
  }
  let watchedCount = 0; let watchingCount = 0; let sumProgress = 0;
  const output = videos.map((video) => {
    const row = progress.get(video.video_number);
    const percent = Math.min(100, Math.max(0, Number(row?.progress_percent ?? 0)));
    const watched = Number(row?.video_selesai ?? 0) === 1;
    const watching = !watched && percent > 0;
    if (watched) watchedCount++;
    if (watching) watchingCount++;
    sumProgress += percent;
    return { ...video, progress_seconds: Number(row?.progress_seconds ?? 0), duration_seconds: Number(row?.duration_seconds ?? 0), progress_percent: Math.round(percent * 100) / 100, watched: Number(watched), video_selesai: Number(watched), completed_at: row?.video_selesai_at ?? null, updated_at: row?.updated_at ?? null, quiz_exists: Number(quizVideos.has(video.video_number)), quiz_question_count: quizVideos.get(video.video_number) ?? 0, quiz_selesai: Number(row?.quiz_selesai ?? 0), quiz_completed_at: row?.quiz_selesai_at ?? null };
  });
  return NextResponse.json({ success: true, peserta: participant, summary: { total_video: videos.length, sudah_dilihat: watchedCount, sedang_menonton: watchingCount, belum_dilihat: Math.max(0, videos.length - watchedCount - watchingCount), rata_rata_progress: videos.length ? Math.round(sumProgress / videos.length * 100) / 100 : 0, training_submitted: Number(trainingSubmitted), training_submitted_at: trainingSubmittedAt }, videos: output }, { headers: { "Cache-Control": "no-store" } });
}
