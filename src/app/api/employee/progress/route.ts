import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEmployeeSession } from "@/lib/employee-session";
import { getEmployeeProgress, getEmployeeQuizzes, getTrainingMaterials, ensureTrainingTables } from "@/lib/employee-training";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const id = await getEmployeeSession();
  if (!id) return NextResponse.json({ success: false, message: "Silakan login terlebih dahulu." }, { status: 401 });
  const materials = await getTrainingMaterials();
  const data = await getEmployeeProgress(id);
  return NextResponse.json({ success: true, materials, ...data, quizzes: await getEmployeeQuizzes(materials) }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  const participantId = await getEmployeeSession();
  if (!participantId) return NextResponse.json({ success: false, message: "Silakan login terlebih dahulu." }, { status: 401 });
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const materialId = Number(form.get("materi_id") ?? 0);
  const materials = await getTrainingMaterials();
  const material = materials.find((entry) => entry.id === materialId);
  await ensureTrainingTables();
  if (["save_video_progress", "complete_video", "save_ppt_page"].includes(action)) {
    const neededType = action === "save_ppt_page" ? "ppt" : "video";
    if (!material || material.type !== neededType) return NextResponse.json({ success: false, message: `Materi ${neededType === "ppt" ? "PPT" : "video"} tidak ditemukan.` }, { status: 400 });
    const seconds = Math.max(0, Number(form.get(action === "complete_video" ? "current_seconds" : "progress_seconds") ?? 0));
    const duration = Math.max(0, Number(form.get("duration_seconds") ?? 0));
    const page = Math.max(0, Number(form.get("page") ?? 0));
    const totalPages = Math.max(0, Number(form.get("total_pages") ?? 0));
    const complete = action === "complete_video" || (action === "save_ppt_page" && ["1", "true"].includes(String(form.get("complete"))));
    const { progress } = await getEmployeeProgress(participantId);
    const safePage = action === "save_ppt_page" && page > Number(progress[materialId]?.last_page ?? 0) + 1 && !complete ? Number(progress[materialId]?.last_page ?? 0) + 1 : page;
    let percent = duration > 0 ? Math.min(100, seconds / duration * 100) : 0;
    if (neededType === "ppt" && totalPages > 0) percent = Math.min(100, safePage / totalPages * 100);
    const finalSeconds = complete && neededType === "video" && duration > 0 ? duration : seconds;
    if (complete) percent = 100;
    await db.execute(`INSERT INTO progres_materi_peserta (peserta_id,materi_id,materi_type,progress_seconds,duration_seconds,progress_percent,last_page,total_pages,materi_selesai,materi_selesai_at)
      VALUES (?,?,?,?,?,?,?,?,?,IF(?=1,NOW(),NULL)) ON DUPLICATE KEY UPDATE materi_type=VALUES(materi_type),progress_seconds=GREATEST(progress_seconds,VALUES(progress_seconds)),duration_seconds=GREATEST(duration_seconds,VALUES(duration_seconds)),progress_percent=GREATEST(progress_percent,VALUES(progress_percent)),last_page=GREATEST(last_page,VALUES(last_page)),total_pages=GREATEST(total_pages,VALUES(total_pages)),materi_selesai=GREATEST(materi_selesai,VALUES(materi_selesai)),materi_selesai_at=CASE WHEN materi_selesai=0 AND VALUES(materi_selesai)=1 THEN NOW() ELSE materi_selesai_at END,updated_at=NOW()`, [participantId, materialId, neededType, finalSeconds, duration, percent, complete && neededType === "ppt" && totalPages ? totalPages : safePage, totalPages, Number(complete), Number(complete)]);
    return NextResponse.json({ success: true, completed: complete });
  }
  if (action === "submit_quiz") {
    const quizzes = await getEmployeeQuizzes(materials);
    if (!quizzes[materialId]?.length) return NextResponse.json({ success: false, message: "Quiz untuk materi ini belum tersedia." }, { status: 400 });
    const { progress } = await getEmployeeProgress(participantId);
    if (!progress[materialId]?.materi_selesai) return NextResponse.json({ success: false, message: "Materi harus selesai terlebih dahulu." }, { status: 400 });
    const type = material?.type ?? "video";
    await db.execute("INSERT INTO progres_materi_peserta (peserta_id,materi_id,materi_type,quiz_selesai,quiz_selesai_at) VALUES (?,?,?,1,NOW()) ON DUPLICATE KEY UPDATE materi_type=VALUES(materi_type),quiz_selesai=1,quiz_selesai_at=COALESCE(quiz_selesai_at,NOW()),updated_at=NOW()", [participantId, materialId, type]);
    return NextResponse.json({ success: true, message: "Quiz materi berhasil disimpan." });
  }
  if (action === "submit_training") {
    const [{ progress }, quizzes] = await Promise.all([getEmployeeProgress(participantId), getEmployeeQuizzes(materials)]);
    for (const entry of materials) {
      if (!progress[entry.id]?.materi_selesai) return NextResponse.json({ success: false, message: "Selesaikan semua materi terlebih dahulu." }, { status: 400 });
      if (quizzes[entry.id]?.length && !progress[entry.id]?.quiz_selesai) return NextResponse.json({ success: false, message: "Selesaikan semua quiz terlebih dahulu." }, { status: 400 });
    }
    await db.execute("INSERT INTO status_training_peserta (peserta_id,training_submitted,training_submitted_at) VALUES (?,1,NOW()) ON DUPLICATE KEY UPDATE training_submitted=1,training_submitted_at=COALESCE(training_submitted_at,NOW()),updated_at=NOW()", [participantId]);
    return NextResponse.json({ success: true, submitted: true, message: "Training berhasil di-submit." });
  }
  return NextResponse.json({ success: false, message: "Aksi tidak dikenal." }, { status: 400 });
}
