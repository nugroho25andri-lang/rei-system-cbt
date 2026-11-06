"use client";
import { useEffect, useRef, useState } from "react";
import type { Material } from "@/lib/employee-training";

type Progress = Record<number, { progress_seconds?: number; progress_percent?: number; last_page?: number; total_pages?: number; materi_selesai?: boolean; quiz_selesai?: boolean }>;
type Quiz = Record<string, unknown>;
type Props = { materials: Material[]; initialProgress: Progress; quizzes: Record<number, Quiz[]>; initialSubmitted: boolean };
async function post(data: Record<string, string | number>) {
  const body = new URLSearchParams(Object.entries(data).map(([key, value]) => [key, String(value)]));
  const response = await fetch("/api/employee/progress", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" }, body });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Gagal menyimpan progress.");
  return result;
}
export default function TrainingClient({ materials, initialProgress, quizzes, initialSubmitted }: Props) {
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [message, setMessage] = useState("");
  const maxSeen = useRef<Record<number, number>>({});
  const pptRefs = useRef<Record<number, { viewer: any; page: number; total: number; busy: boolean }>>({});
  const hasQuiz = (id: number) => (quizzes[id] ?? []).length > 0;
  const done = (id: number) => !!progress[id]?.materi_selesai;
  const quizDone = (id: number) => !!progress[id]?.quiz_selesai;
  const unlocked = (index: number) => index === 0 || (done(materials[index - 1].id) && (!hasQuiz(materials[index - 1].id) || quizDone(materials[index - 1].id)));
  const allDone = materials.length > 0 && materials.every((material) => done(material.id) && (!hasQuiz(material.id) || quizDone(material.id)));
  async function markDone(id: number, type: string, duration = 0) {
    const result = await post({ action: type === "video" ? "complete_video" : "save_ppt_page", materi_id: id, current_seconds: duration, duration_seconds: duration, page: pptRefs.current[id]?.total ?? 1, total_pages: pptRefs.current[id]?.total ?? 1, complete: 1 });
    if (result.success) setProgress((current) => ({ ...current, [id]: { ...current[id], materi_selesai: true, progress_percent: 100 } }));
  }
  useEffect(() => {
    let active = true;
    async function loadReaders() {
      const { PptxViewer } = await (new Function("url", "return import(url)") as (url: string) => Promise<{ PptxViewer: new (canvas: HTMLCanvasElement, options: Record<string, unknown>) => any }>) ("https://esm.sh/@silurus/ooxml@0.85.0/pptx");
      for (const material of materials.filter((entry) => entry.type === "ppt" && entry.ppt)) {
        if (!active) return;
        const canvas = document.getElementById(`pptxCanvas_${material.id}`) as HTMLCanvasElement | null;
        if (!canvas) continue;
        try {
          const viewer = new PptxViewer(canvas, { width: Math.min(1100, Math.max(320, canvas.parentElement?.clientWidth ?? 800)), useGoogleFonts: true, progressiveLayout: true, onSlideChange: (page: number, total: number) => { const state = pptRefs.current[material.id]; if (state) { state.page = page + 1; state.total = Number(total || state.total); } } });
          const saved = Math.max(1, Number(progress[material.id]?.last_page ?? 1));
          pptRefs.current[material.id] = { viewer, page: saved, total: 0, busy: false };
          await viewer.load(material.ppt);
          if (viewer.waitUntilLayoutComplete) await viewer.waitUntilLayoutComplete();
          const state = pptRefs.current[material.id];
          state.total = Number(state.total || viewer.slideCount || 1);
          await viewer.goToSlide(Math.min(saved, state.total) - 1);
          state.page = Math.min(saved, state.total);
          const page = document.getElementById(`pptPage_${material.id}`); const total = document.getElementById(`pptTotal_${material.id}`);
          if (page) page.textContent = String(state.page); if (total) total.textContent = String(state.total);
        } catch (error) { console.error("PPTX reader failed", error); }
      }
    }
    loadReaders().catch((error) => console.error("PPTX reader failed", error));
    return () => { active = false; };
  }, [materials]);
  async function nextSlide(id: number) {
    const state = pptRefs.current[id]; if (!state || state.busy || state.page >= state.total) return;
    state.busy = true;
    try {
      state.page++; await state.viewer.goToSlide(state.page - 1);
      const page = document.getElementById(`pptPage_${id}`); if (page) page.textContent = String(state.page);
      await post({ action: "save_ppt_page", materi_id: id, page: state.page, total_pages: state.total, complete: Number(state.page >= state.total) });
      if (state.page >= state.total) setProgress((current) => ({ ...current, [id]: { ...current[id], materi_selesai: true, progress_percent: 100 } }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal membuka slide."); }
    finally { state.busy = false; }
  }
  async function submitQuiz(id: number, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { await post({ action: "submit_quiz", materi_id: id }); setProgress((current) => ({ ...current, [id]: { ...current[id], quiz_selesai: true } })); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Quiz gagal disimpan."); }
  }
  return <section className="training-materials"><h2>Materi Pelatihan</h2>{!materials.length && <p className="locked-message">Belum ada materi dari Admin.</p>}
    {materials.map((material, index) => {
      const canOpen = unlocked(index) || done(material.id);
      return <article key={material.id} className={`material-card ${!canOpen ? "is-locked" : ""}`}><header><h3>Materi {index + 1} — {material.title}</h3><span>{material.type === "ppt" ? "PPT" : "VIDEO"}</span></header>
        {!canOpen && <p className="locked-message">Selesaikan materi sebelumnya{index > 0 && hasQuiz(materials[index - 1].id) ? " dan quiz-nya" : ""} untuk membuka materi ini.</p>}
        {canOpen && (material.type === "video" ? (material.embed ? <iframe id={`video_${material.id}`} src={`${material.embed}${material.embed.includes("?") ? "&" : "?"}enablejsapi=1`} title={material.title} allowFullScreen /> : material.src ? <video controls preload="metadata" playsInline src={material.src} ref={(node) => { if (node && !maxSeen.current[material.id]) maxSeen.current[material.id] = Number(progress[material.id]?.progress_seconds ?? 0); }} onLoadedMetadata={(event) => { const node = event.currentTarget; const target = Math.min(maxSeen.current[material.id] || 0, Math.max(0, node.duration - .5)); node.currentTime = target; }} onSeeking={(event) => { const node = event.currentTarget; if (!done(material.id) && node.currentTime > (maxSeen.current[material.id] || 0) + 1.5) node.currentTime = maxSeen.current[material.id] || 0; }} onTimeUpdate={(event) => { const node = event.currentTarget; const current = node.currentTime; if (current <= (maxSeen.current[material.id] || 0) + 1.5) maxSeen.current[material.id] = Math.max(maxSeen.current[material.id] || 0, current); if (node.duration > 0 && current > 0 && current - (maxSeen.current[material.id + 1000000] || 0) >= 8) { maxSeen.current[material.id + 1000000] = current; void post({ action: "save_video_progress", materi_id: material.id, progress_seconds: current, duration_seconds: node.duration }).catch(() => {}); } }} onEnded={(event) => void markDone(material.id, "video", event.currentTarget.duration).catch((error) => setMessage(error.message))} /> : <p>File video belum tersedia.</p>) : material.ppt ? <><div className="pptx-toolbar"><button type="button" onClick={() => void nextSlide(material.id)}>Berikutnya</button><b>Slide <span id={`pptPage_${material.id}`}>1</span> / <span id={`pptTotal_${material.id}`}>-</span></b></div><div className="pptx-canvas-wrap"><canvas id={`pptxCanvas_${material.id}`} /></div></> : <p>File PPTX belum tersedia.</p>)}
        <p>{done(material.id) ? "✓ Materi sudah selesai." : canOpen ? material.type === "ppt" ? "Baca semua slide sampai selesai." : "Tonton video sampai selesai." : "🔒 Materi terkunci."}</p>
        {canOpen && hasQuiz(material.id) && done(material.id) && !quizDone(material.id) && <details><summary>Buka quiz materi {index + 1}</summary><form onSubmit={(event) => void submitQuiz(material.id, event)}>{(quizzes[material.id] ?? []).map((question) => <fieldset key={String(question.id)}><legend>{String(question.nomor_soal)}. {String(question.pertanyaan)}</legend>{["A", "B", "C", "D"].map((option) => <label key={option}><input type="radio" name={`answer_${question.id}`} value={option} required /> {option}. {String(question[`pilihan_${option.toLowerCase()}`] ?? "")}</label>)}</fieldset>)}<button type="submit">Kirim jawaban quiz</button></form></details>}
      </article>;
    })}
    {allDone && <div className="panel training-submit"><h2>Semua materi &amp; quiz selesai</h2><button disabled={submitted} onClick={async () => { if (!window.confirm("Apakah Anda yakin ingin Submit Training?")) return; try { await post({ action: "submit_training" }); setSubmitted(true); } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal submit."); } }}>{submitted ? "Training sudah di-submit" : "Submit Training"}</button></div>}
    {message && <p role="alert" className="error">{message}</p>}
  </section>;
}
