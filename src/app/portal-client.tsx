"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { TRAINING_DAYS } from "@/lib/exam-days";

type Participant = { id: number; nama_peserta: string; nip: string; jabatan: string | null; batch: string | null; cabang: string | null; email: string | null };
type ExamType = "pretest" | "posttest";
type Question = { id?: number; no_soal: number; pertanyaan: string; gambar?: string | null; bobot: number; waktu_soal?: number; jenis_soal?: string; pilihan_a?: string | null; pilihan_b?: string | null; pilihan_c?: string | null; pilihan_d?: string | null };
type PaperOption = { value: string; label: string; text: string };
type PaperQuestion = Question & { options: PaperOption[] };
type Day5Aspect = { id: number; kategori: string; nomor: number; aspek_penilaian: string };
type ExamAnswer = { noSoal: number; jenisSoal: string; bobot: number; skorAuto: number; fileName: string; filePath: string; jawabanPeserta: string };
type UploadedAnswer = { path: string; name: string; size: number };

const days = TRAINING_DAYS;
const day5Fields = ["smiling_voice","intonasi","artikulasi","senyum_eye_contact","body_language","penyambutan_customer","menanyakan_kepemilikan","identitas_usia","rekening_pribadi","pengecekan_barang","pembuatan_invoice","surat_pernyataan","penandatanganan_dokumen","payment","closing"];
const scoreLabels: Record<number, string> = { 1: "Kurang", 2: "Cukup", 3: "Baik", 4: "Sangat baik", 5: "Luar biasa" };

const goldButton = "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-300 via-gold-400 to-gold-600 px-5 py-3.5 text-sm font-black text-rei-900 shadow-lg shadow-gold-600/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gold-600/35 focus:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";
const fieldClass = "w-full rounded-2xl border border-rei-900/10 bg-white px-4 py-3 text-sm text-rei-900 outline-none transition placeholder:text-rei-900/35 focus:border-gold-500 focus:ring-4 focus:ring-gold-400/20";

function seedFrom(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function mulberry32(seed: number) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let mix = Math.imul(value ^ (value >>> 15), 1 | value);
    mix = (mix + Math.imul(mix ^ (mix >>> 7), 61 | mix)) ^ mix;
    return ((mix ^ (mix >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}
function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/95 p-1 shadow-lg shadow-black/30 ring-1 ring-gold-400/50">
        <img src="/logo-rei-2.png" alt="Raja Emas Indonesia" className="h-full w-auto" />
      </span>
      <span className="leading-tight">
        <span className="block text-[9px] font-bold uppercase tracking-[0.28em] text-gold-300/85">Raja Emas Indonesia</span>
        <span className="block text-sm font-black tracking-tight text-white">CBT Peserta</span>
      </span>
    </div>
  );
}

function Background() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="exam-bg absolute inset-0" />
      <div className="exam-grid absolute inset-0" />
      <div className="exam-orb absolute -left-24 top-10 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
      <div className="exam-orb exam-orb-slow absolute -right-16 top-1/3 h-80 w-80 rounded-full bg-[#a34f97]/35 blur-3xl" />
      <div className="exam-orb absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-gold-400/10 blur-3xl" />
    </div>
  );
}

function Steps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur sm:flex">
      {["Identitas", "Ujian", "Selesai"].map((label, index) => {
        const step = index + 1;
        const active = step === current;
        const passed = step < current;
        return (
          <li key={label} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${active ? "bg-gold-400 text-rei-900 shadow" : passed ? "text-gold-300/90" : "text-white/40"}`}>
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${active ? "bg-rei-900/15" : passed ? "bg-gold-400/20 text-gold-300" : "bg-white/10"}`}>{passed ? "✓" : step}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function PortalHeader({ step, day, examType }: { step: 1 | 2 | 3; day?: string; examType?: ExamType | "" }) {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pt-5 sm:px-6">
      <Logo />
      <div className="flex items-center gap-3">
        <Steps current={step} />
        {day && step === 2 && <span className="rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1.5 text-[11px] font-bold text-gold-200">{day}{examType ? ` · ${examType === "pretest" ? "Pretest" : "Posttest"}` : ""}</span>}
      </div>
    </header>
  );
}

function Alert({ kind = "error", children }: { kind?: "error" | "info" | "success"; children: ReactNode }) {
  const tone = {
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-gold-300/60 bg-gold-200/40 text-rei-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  }[kind];
  return <div role={kind === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium ${tone}`}>{children}</div>;
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true"><path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ClockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.7" /><path d="M10 5.8V10l2.8 1.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-rei-900/30 border-t-rei-900" aria-hidden="true" />;
}

const confetti = [
  { left: "12%", delay: "0s", color: "#d4af37", rotate: "20deg" },
  { left: "22%", delay: ".4s", color: "#f7ecc3", rotate: "-15deg" },
  { left: "34%", delay: ".9s", color: "#a34f97", rotate: "40deg" },
  { left: "45%", delay: ".2s", color: "#34d399", rotate: "-30deg" },
  { left: "56%", delay: "1.1s", color: "#d4af37", rotate: "15deg" },
  { left: "66%", delay: ".6s", color: "#f7ecc3", rotate: "-40deg" },
  { left: "76%", delay: ".1s", color: "#a34f97", rotate: "25deg" },
  { left: "86%", delay: ".8s", color: "#34d399", rotate: "-20deg" },
  { left: "28%", delay: "1.4s", color: "#e0b135", rotate: "50deg" },
  { left: "72%", delay: "1.6s", color: "#e0b135", rotate: "-50deg" },
];

export default function ExamPortal() {
  const [participantTerm, setParticipantTerm] = useState("");
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [email, setEmail] = useState("");
  const [examType, setExamType] = useState<ExamType | "">("");
  const [day, setDay] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [day5Aspects, setDay5Aspects] = useState<Day5Aspect[]>([]);
  const [day5Scores, setDay5Scores] = useState<Record<string, number>>(() => Object.fromEntries(day5Fields.map((field) => [field, 5])));
  const [day5Notes, setDay5Notes] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [fileAnswers, setFileAnswers] = useState<Record<number, UploadedAnswer>>({});
  const [uploadingNo, setUploadingNo] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const finishedRef = useRef(false);
  const submittingRef = useRef(false);
  const timeoutRef = useRef<() => void>(() => {});
  const payloadRef = useRef<() => string>(() => "{}");

  const paper = useMemo<PaperQuestion[]>(() => {
    if (!questions.length) return [];
    const random = mulberry32(seedFrom(`${participant?.nip ?? "peserta"}|${day}`));
    return shuffle(questions, random).map((question) => {
      const choices: Array<[string, string]> = [
        ["A", String(question.pilihan_a ?? "")],
        ["B", String(question.pilihan_b ?? "")],
        ["C", String(question.pilihan_c ?? "")],
        ["D", String(question.pilihan_d ?? "")],
      ];
      const options = shuffle(choices.filter(([, text]) => text.trim() !== ""), random).map(([value, text], index) => ({ value, label: "ABCD"[index], text }));
      return { ...question, options };
    });
  }, [questions, participant?.nip, day]);

  const isDay5 = day5Aspects.length > 0;
  const inExam = questions.length > 0 && !isDay5;
  const currentQuestion = paper[currentIndex];
  const currentValue = currentQuestion ? (answers[currentQuestion.no_soal] ?? "") : "";
  const answeredCount = paper.filter((question) => (answers[question.no_soal] ?? "").trim() !== "" || Boolean(fileAnswers[question.no_soal])).length;
  const progress = paper.length ? Math.round((answeredCount / paper.length) * 100) : 0;
  const currentLimit = Number(currentQuestion?.waktu_soal ?? 0) || 0;
  const isLastQuestion = currentIndex >= paper.length - 1;

  const day5Groups = useMemo(() => {
    const groups: Array<{ kategori: string; aspects: Day5Aspect[] }> = [];
    for (const aspect of day5Aspects) {
      const kategori = String(aspect.kategori ?? "").trim() || "Penilaian";
      const found = groups.find((group) => group.kategori.toLowerCase() === kategori.toLowerCase());
      if (found) found.aspects.push(aspect); else groups.push({ kategori, aspects: [aspect] });
    }
    return groups;
  }, [day5Aspects]);

  const day5Average = day5Aspects.length
    ? (day5Aspects.reduce((sum, aspect) => {
        const index = Number(aspect.nomor) - 1;
        const offset = String(aspect.kategori).toLowerCase().trim() === "service excellent" ? 0 : 5;
        const field = day5Fields[offset + index];
        return sum + (field ? Number(day5Scores[field] ?? 0) : 0);
      }, 0) / day5Aspects.length).toFixed(1)
    : "0.0";

  function buildExamPayload() {
    if (!participant || !questions.length) return "{}";
    const listJawaban: ExamAnswer[] = questions.map((question) => ({
      noSoal: Number(question.no_soal),
      jenisSoal: "text",
      bobot: Number(question.bobot) || 0,
      skorAuto: 0,
      fileName: fileAnswers[question.no_soal]?.name ?? "",
      filePath: fileAnswers[question.no_soal]?.path ?? "",
      jawabanPeserta: answers[question.no_soal] || (fileAnswers[question.no_soal] ? `[Berkas: ${fileAnswers[question.no_soal].name}]` : ""),
    }));
    return JSON.stringify({ namaPeserta: participant.nama_peserta, nip: participant.nip, jabatan: participant.jabatan ?? "", batch: participant.batch ?? "", cabang: participant.cabang ?? "", day, jenisTes: examType, listJawaban });
  }
  payloadRef.current = buildExamPayload;

  async function submitExam(automatic = false) {
    if (!participant || !questions.length || submittingRef.current || finishedRef.current) return;
    submittingRef.current = true;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/cbt?action=submit_jawaban", { method: "POST", headers: { "Content-Type": "application/json" }, body: buildExamPayload() });
      const result = await response.json();
      if (result.status !== "success") throw new Error(result.message || "Jawaban gagal disimpan.");
      finishedRef.current = true;
      setSubmitted(true);
      setMessage("Jawaban ujian berhasil dikirim.");
      window.scrollTo({ top: 0 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal mengirim jawaban.");
      if (automatic) setToast("Gagal mengirim otomatis. Periksa koneksi lalu kirim ulang.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  async function uploadAnswerFile(question: Question, file: File | undefined) {
    if (!file || !participant || !day) return;
    const noSoal = Number(question.no_soal);
    setUploadingNo(noSoal); setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("day", day);
      form.append("jenis_tes", examType);
      form.append("no_soal", String(noSoal));
      const response = await fetch("/api/cbt?action=upload_jawaban_file", { method: "POST", body: form });
      const result = await response.json();
      if (result.status !== "success") throw new Error(result.message || "Berkas gagal diunggah.");
      setFileAnswers((current) => ({ ...current, [noSoal]: { path: String(result.filePath), name: String(result.fileName || file.name), size: Number(result.size || file.size) } }));
      setToast(`Berkas ${result.fileName || file.name} berhasil diunggah.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Berkas gagal diunggah.");
    } finally {
      setUploadingNo(null);
    }
  }

  function handleTimeout() {
    if (finishedRef.current || submitted) return;
    if (!currentQuestion) return;
    if (isLastQuestion) { void submitExam(true); return; }
    setToast(`Waktu soal ${currentQuestion.no_soal} habis — lanjut otomatis.`);
    setCurrentIndex((index) => Math.min(index + 1, paper.length - 1));
  }
  timeoutRef.current = handleTimeout;

  useEffect(() => {
    if (!currentQuestion) return;
    const limit = Number(currentQuestion.waktu_soal ?? 0) || 0;
    setTimeLeft(limit);
    if (!limit) return;
    const startedAt = Date.now();
    let fired = false;
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, limit - Math.floor((Date.now() - startedAt) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && !fired) {
        fired = true;
        window.clearInterval(interval);
        timeoutRef.current();
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [currentIndex, currentQuestion?.no_soal, currentQuestion?.waktu_soal]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!questions.length || submitted) return;
    const onPageHide = (event: PageTransitionEvent) => {
      if (event.persisted || finishedRef.current || submittingRef.current) return;
      const body = payloadRef.current();
      if (!body || body === "{}") return;
      if (navigator.sendBeacon) navigator.sendBeacon("/api/cbt?action=submit_jawaban", new Blob([body], { type: "application/json" }));
      else void fetch("/api/cbt?action=submit_jawaban", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [questions.length, submitted]);

  async function openExam() {
    setBusy(true); setError(""); setMessage("");
    try {
      if (!participantTerm.trim()) throw new Error("Masukkan nama lengkap atau NIP kamu.");
      if (!examType) throw new Error("Pilih pretest atau posttest terlebih dahulu.");
      if (!day) throw new Error("Pilih hari ujian terlebih dahulu.");
      if (!token.trim()) throw new Error("Masukkan token ujian dari trainer.");

      const identifyForm = new FormData(); identifyForm.set("term", participantTerm.trim());
      const identifyResponse = await fetch("/api/cbt?action=identify_peserta", { method: "POST", body: identifyForm });
      const identifyResult = await identifyResponse.json();
      if (identifyResult.status !== "success") throw new Error(identifyResult.message || "Peserta tidak ditemukan.");
      const found = identifyResult.data as Participant;
      setParticipant(found);

      const resolvedEmail = (email.trim() || String(found.email ?? "").trim()).toLowerCase();
      if (!resolvedEmail) throw new Error("Email peserta belum ada. Silakan isi email terlebih dahulu.");
      setEmail(resolvedEmail);

      const emailForm = new FormData(); emailForm.set("id_peserta", String(found.id)); emailForm.set("email", resolvedEmail);
      const emailResponse = await fetch("/api/cbt?action=save_peserta_email", { method: "POST", body: emailForm });
      const emailResult = await emailResponse.json(); if (emailResult.status !== "success") throw new Error(emailResult.message || "Email peserta gagal disimpan.");

      const tokenForm = new FormData(); tokenForm.set("day", day); tokenForm.set("jenis_tes", examType); tokenForm.set("token", token.trim()); tokenForm.set("id_peserta", String(found.id));
      const tokenResponse = await fetch("/api/cbt?action=check_token", { method: "POST", body: tokenForm });
      const tokenResult = await tokenResponse.json(); if (tokenResult.status !== "success") throw new Error(tokenResult.message || "Token tidak valid.");

      if (day === "Day 5") {
        const aspectResponse = await fetch("/api/cbt?action=get_day5_aspek", { cache: "no-store" });
        const aspectResult = await aspectResponse.json(); if (aspectResult.status !== "success") throw new Error(aspectResult.message || "Aspek Day 5 tidak dapat dimuat.");
        setDay5Aspects(aspectResult.data); setDay5Scores(Object.fromEntries(day5Fields.map((field) => [field, 5]))); setDay5Notes({}); setSubmitted(false);
        window.scrollTo({ top: 0 });
        return;
      }

      const questionResponse = await fetch(`/api/cbt?action=get_soal&day=${encodeURIComponent(day)}&jenis_tes=${examType}`, { cache: "no-store" });
      const questionResult = await questionResponse.json(); if (questionResult.status !== "success") throw new Error(questionResult.message || "Soal tidak dapat dimuat.");
      finishedRef.current = false;
      setQuestions(questionResult.data); setAnswers({}); setFileAnswers({}); setCurrentIndex(0); setTimeLeft(null); setToast(""); setSubmitted(false);
      window.scrollTo({ top: 0 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal membuka ujian.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDay5() {
    if (!participant) return;
    setBusy(true); setError("");
    const payload: Record<string, unknown> = { action: "save_day5", id_peserta: participant.id, nama: participant.nama_peserta };
    for (const field of day5Fields) { payload[field] = day5Scores[field]; payload[`${field}_catatan`] = day5Notes[field] || ""; }
    try {
      const response = await fetch("/api/cbt?action=save_day5", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json(); if (result.status !== "success") throw new Error(result.message || "Gagal menyimpan penilaian Day 5.");
      finishedRef.current = true;
      setSubmitted(true); setMessage(`Penilaian Day 5 tersimpan. Total: ${result.total_nilai} / ${result.nilai_maksimal} · Nilai akhir: ${result.nilai_akhir} / ${result.nilai_maksimal_akhir}.`); window.scrollTo({ top: 0 });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menyimpan penilaian Day 5."); }
    finally { setBusy(false); }
  }

  function goNext() {
    if (!currentQuestion || finishedRef.current) return;
    if (isLastQuestion) { void submitExam(); return; }
    setToast("");
    setCurrentIndex((index) => Math.min(index + 1, paper.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restart() {
    setParticipantTerm(""); setParticipant(null); setEmail(""); setExamType(""); setDay(""); setToken(""); setShowToken(false);
    setQuestions([]); setDay5Aspects([]); setAnswers({}); setFileAnswers({}); setUploadingNo(null); setDay5Notes({}); setDay5Scores(Object.fromEntries(day5Fields.map((field) => [field, 5])));
    setCurrentIndex(0); setTimeLeft(null); setToast(""); setSubmitted(false); setError(""); setMessage("");
    finishedRef.current = false; submittingRef.current = false;
    window.scrollTo({ top: 0 });
  }

  /* ---------- Success screen ---------- */
  if (submitted) {
    return (
      <main className="relative min-h-dvh overflow-hidden text-white">
        <Background />
        <PortalHeader step={3} />
        <section className="relative z-10 mx-auto flex min-h-[calc(100dvh-90px)] w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-96 overflow-hidden">
            {confetti.map((piece, index) => (
              <span key={index} className="exam-confetti-piece" style={{ left: piece.left, animationDelay: piece.delay, backgroundColor: piece.color, transform: `rotate(${piece.rotate})` }} />
            ))}
          </div>
          <div className="exam-pop relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-2xl shadow-emerald-500/40">
            <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-emerald-400/30" />
            <CheckIcon className="h-12 w-12 text-white" />
          </div>
          <p className="mt-6 text-[11px] font-black uppercase tracking-[0.3em] text-gold-300">Selesai</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{isDay5 ? "Penilaian tersimpan!" : "Jawaban terkirim!"}</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">{isDay5 ? "Terima kasih, penilaian Day 5 sudah masuk ke sistem." : "Terima kasih sudah mengerjakan dengan sungguh-sungguh. Jawabanmu sudah tersimpan di sistem."}</p>

          <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
            {[
              { label: "Peserta", value: participant?.nama_peserta ?? "-" },
              { label: "Sesi", value: day || "-" },
              isDay5 ? { label: "Rata-rata", value: `${day5Average} / 5` } : { label: "Terjawab", value: `${answeredCount} / ${paper.length}` },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{item.label}</p>
                <p className="mt-1 truncate text-sm font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {message && <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-2.5 text-xs font-medium text-emerald-200">{message}</p>}

          <button type="button" onClick={restart} className={`${goldButton} mt-8 px-7`}>Kembali ke Beranda <ArrowIcon /></button>
          <p className="mt-4 text-[11px] text-white/35">Jendela ini boleh ditutup. Hubungi trainer jika ada kendala.</p>
        </section>
      </main>
    );
  }

  /* ---------- Day 5 scoring ---------- */
  if (isDay5) {
    return (
      <main className="relative min-h-dvh overflow-x-hidden pb-28 text-white lg:pb-10">
        <Background />
        <PortalHeader step={2} day={day} examType={examType} />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {error && <div className="mb-4"><Alert>{error}</Alert></div>}
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-300/80">Formulir penilaian</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Day 5 · Service Excellent & Alur Transaksi</h1>
              <p className="mt-1 text-sm text-white/45">Beri penilaian 1–5 untuk setiap aspek beserta catatan.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-white/70 backdrop-blur">{day5Aspects.length} aspek</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              {day5Groups.map((group) => (
                <section key={group.kategori} className="exam-rise">
                  <div className="mb-3 flex items-center gap-2.5 px-1">
                    <span className="h-2 w-2 rounded-full bg-gold-400 shadow-[0_0_12px_2px_rgba(212,175,55,.55)]" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-gold-200">{group.kategori}</h2>
                    <span className="text-xs text-white/35">{group.aspects.length} aspek</span>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    {group.aspects.map((aspect) => {
                      const index = Number(aspect.nomor) - 1;
                      const offset = String(aspect.kategori).toLowerCase().trim() === "service excellent" ? 0 : 5;
                      const field = day5Fields[offset + index];
                      if (!field) return null;
                      const score = day5Scores[field];
                      return (
                        <article key={aspect.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white shadow-xl shadow-black/20">
                          <div className="flex items-start gap-3 p-4 sm:p-5">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 text-sm font-black text-rei-900 shadow">{aspect.nomor}</span>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-rei-900/40">{aspect.kategori}</p>
                              <p className="mt-0.5 text-sm font-semibold leading-snug text-rei-900">{aspect.aspek_penilaian}</p>
                            </div>
                          </div>
                          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                            <div className="grid grid-cols-5 gap-1.5" role="group" aria-label={`Nilai untuk ${aspect.aspek_penilaian}`}>
                              {[1, 2, 3, 4, 5].map((value) => (
                                <button key={value} type="button" aria-pressed={score === value} aria-label={`${value} — ${scoreLabels[value]}`} disabled={submitted}
                                  onClick={() => setDay5Scores((current) => ({ ...current, [field]: value }))}
                                  className={`rounded-xl border py-2 text-sm font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50 ${score === value ? "border-transparent bg-gradient-to-br from-gold-400 to-gold-600 text-rei-900 shadow-md shadow-gold-600/30" : "border-rei-900/10 bg-white text-rei-900/50 hover:border-gold-400/60 hover:bg-gold-200/30 hover:text-rei-900"}`}>
                                  {value}
                                </button>
                              ))}
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-rei-900/45">Nilai {score} · {scoreLabels[score]}</span>
                              <span className="text-rei-900/30">dari 5</span>
                            </div>
                            <textarea rows={2} maxLength={5000} value={day5Notes[field] || ""} onChange={(event) => setDay5Notes((current) => ({ ...current, [field]: event.target.value }))} placeholder="Catatan (opsional)" disabled={submitted}
                              className="mt-3 w-full resize-y rounded-xl border border-rei-900/10 bg-[#faf8fa] px-3 py-2 text-xs text-rei-900 outline-none transition placeholder:text-rei-900/30 focus:border-gold-500 focus:bg-white focus:ring-4 focus:ring-gold-400/20" />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-6 space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/45">Aspek dinilai</p>
                    <p className="text-2xl font-black text-gold-300">{day5Aspects.length}</p>
                  </div>
                  <p className="mt-2 text-xs text-white/45">Rata-rata sementara {day5Average} dari 5</p>
                </div>
                <button type="button" disabled={busy} onClick={() => void submitDay5()} className={`${goldButton} w-full`}>
                  {busy ? <><Spinner /> Menyimpan…</> : <>Simpan Penilaian <ArrowIcon /></>}
                </button>
                <p className="px-1 text-center text-[11px] leading-relaxed text-white/35">Pastikan seluruh aspek sudah dinilai sebelum menyimpan.</p>
              </div>
            </aside>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#1e0a1d]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="min-w-0 flex-1 text-[11px] font-bold text-white/60">{day5Aspects.length} aspek · rata-rata {day5Average}</div>
            <button type="button" disabled={busy} onClick={() => void submitDay5()} className={`${goldButton} shrink-0 px-4 py-2.5`}>{busy ? <Spinner /> : "Simpan"}</button>
          </div>
        </div>
      </main>
    );
  }

  /* ---------- Exam (one question at a time) ---------- */
  if (inExam && currentQuestion) {
    const answeredNow = currentValue.trim() !== "" || Boolean(fileAnswers[currentQuestion.no_soal]);
    const urgent = currentLimit > 0 && (timeLeft ?? currentLimit) <= 10;
    const optionSelected = currentQuestion.jenis_soal === "pilihan_ganda" ? currentValue : "";
    return (
      <main className="relative min-h-dvh overflow-x-hidden pb-16 text-white">
        <Background />
        <PortalHeader step={2} day={day} examType={examType} />
        {toast && (
          <div className="fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
            <div className="exam-pop rounded-2xl border border-gold-300/40 bg-[#2b1129]/95 px-4 py-3 text-center text-xs font-semibold text-gold-100 shadow-2xl backdrop-blur">{toast}</div>
          </div>
        )}
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
          {error && <div className="mb-4"><Alert>{error}</Alert></div>}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-300/80">Lembar ujian</p>
              <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">{day} · Soal {currentIndex + 1} dari {paper.length}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/60 backdrop-blur">{answeredCount} terjawab</span>
              {currentLimit > 0 ? (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black tabular-nums backdrop-blur ${urgent ? "animate-pulse border-rose-400/50 bg-rose-500/20 text-rose-200" : "border-gold-400/40 bg-gold-400/10 text-gold-200"}`}>
                  <ClockIcon className="h-3.5 w-3.5" /> {formatTime(timeLeft ?? currentLimit)}
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/50">Tanpa batas</span>
              )}
            </div>
          </div>

          <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_270px]">
            <article key={currentIndex} className="exam-pop overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/30">
              <div className="flex flex-wrap items-center gap-3 border-b border-rei-900/5 bg-gradient-to-r from-gold-200/70 via-gold-200/20 to-transparent px-4 py-3 sm:px-5">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 text-base font-black text-rei-900 shadow-inner">{currentIndex + 1}</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rei-900/40">Pertanyaan {currentIndex + 1} / {paper.length}</p>
                  <p className="text-xs font-semibold text-rei-900/55">Bobot {currentQuestion.bobot}{currentLimit > 0 ? ` · ${currentLimit} detik` : " · bebas waktu"}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${currentQuestion.jenis_soal === "pilihan_ganda" ? "bg-rei-900 text-gold-300" : currentQuestion.jenis_soal === "upload" ? "bg-emerald-100 text-emerald-700" : "bg-rei-100 text-rei-900/60"}`}>{currentQuestion.jenis_soal === "pilihan_ganda" ? "Pilihan ganda" : currentQuestion.jenis_soal === "upload" ? "Upload berkas" : "Esai"}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${answeredNow ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {answeredNow ? <><CheckIcon className="h-3 w-3" /> Terjawab</> : "Belum dijawab"}
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-rei-900 sm:text-base">{currentQuestion.pertanyaan}</p>
                {currentQuestion.gambar && <img src={currentQuestion.gambar} alt="Gambar soal" loading="lazy" className="mt-4 max-h-96 w-auto max-w-full rounded-2xl border border-rei-900/10" />}

                {currentQuestion.jenis_soal === "pilihan_ganda" ? (
                  <div className="mt-5 grid gap-2.5">
                    {currentQuestion.options.map((option) => {
                      const selected = optionSelected === option.value;
                      return (
                        <label key={option.value} className={`group flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition sm:p-4 ${selected ? "border-gold-500 bg-gradient-to-br from-gold-200/80 to-white shadow-lg shadow-gold-500/15" : "border-rei-900/10 bg-white hover:-translate-y-0.5 hover:border-gold-400/70 hover:bg-gold-200/20 hover:shadow-md"} focus-within:ring-4 focus-within:ring-gold-400/25`}>
                          <input type="radio" name={`soal-${currentQuestion.no_soal}`} value={option.value} checked={selected} onChange={() => setAnswers((current) => ({ ...current, [currentQuestion.no_soal]: option.value }))} className="sr-only" />
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-black transition ${selected ? "bg-rei-900 text-gold-300" : "bg-rei-100 text-rei-900/60 group-hover:bg-white"}`}>{option.label}</span>
                          <span className="flex-1 text-sm leading-relaxed text-rei-900/85">{option.text}</span>
                          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${selected ? "border-rei-900 bg-rei-900 text-gold-300" : "border-rei-900/20 text-transparent"}`}><CheckIcon className="h-3 w-3" /></span>
                        </label>
                      );
                    })}
                  </div>
                ) : currentQuestion.jenis_soal === "upload" ? (
                  <div className="mt-5">
                    <div className={`rounded-2xl border-2 border-dashed p-4 transition ${fileAnswers[currentQuestion.no_soal] ? "border-emerald-400 bg-emerald-50/60" : "border-rei-900/15 bg-[#faf8fa]"}`}>
                      {fileAnswers[currentQuestion.no_soal] ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><CheckIcon className="h-5 w-5" /></span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-rei-900">{fileAnswers[currentQuestion.no_soal].name}</p>
                            <p className="text-[11px] text-rei-900/50">{(fileAnswers[currentQuestion.no_soal].size / 1024 / 1024).toFixed(2)} MB · berhasil diunggah</p>
                          </div>
                          <label className="cursor-pointer rounded-lg border border-rei-900/15 bg-white px-3 py-1.5 text-xs font-bold text-rei-900 transition hover:border-gold-400">
                            Ganti berkas
                            <input type="file" className="sr-only" accept=".xlsx,.xls,.pdf,.png" onChange={(event) => void uploadAnswerFile(currentQuestion, event.target.files?.[0])} disabled={uploadingNo === currentQuestion.no_soal} />
                          </label>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 py-6 text-center">
                          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-200/60 text-rei-900"><ArrowIcon /></span>
                          <span className="text-sm font-bold text-rei-900">{uploadingNo === currentQuestion.no_soal ? "Mengunggah berkas…" : "Klik untuk memilih berkas jawaban"}</span>
                          <span className="text-[11px] text-rei-900/45">Excel (.xlsx/.xls), PDF, atau PNG · maksimal 8 MB</span>
                          <input type="file" className="sr-only" accept=".xlsx,.xls,.pdf,.png" onChange={(event) => void uploadAnswerFile(currentQuestion, event.target.files?.[0])} disabled={uploadingNo === currentQuestion.no_soal} />
                        </label>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-rei-900/45">Unggah berkas terlebih dahulu, lalu tekan {isLastQuestion ? "Kirim Jawaban" : "Lanjut"}. Pastikan berkas sudah benar sebelum dikirim.</p>
                  </div>
                ) : (
                  <div className="mt-5">
                    <textarea rows={6} value={currentValue} onChange={(event) => setAnswers((current) => ({ ...current, [currentQuestion.no_soal]: event.target.value }))}
                      placeholder="Tulis jawabanmu di sini…"
                      className="w-full resize-y rounded-2xl border border-rei-900/10 bg-[#faf8fa] p-4 text-sm leading-relaxed text-rei-900 outline-none transition placeholder:text-rei-900/30 focus:border-gold-500 focus:bg-white focus:ring-4 focus:ring-gold-400/20" />
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-rei-900/40">
                      <span>Jawaban esai akan dikoreksi oleh trainer.</span>
                      <span>{currentValue.length} karakter</span>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-rei-900/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] leading-relaxed text-rei-900/45">
                    {currentLimit > 0 ? "Waktu habis akan otomatis lanjut ke soal berikutnya." : "Jawab soal ini untuk melanjutkan."}
                    {isLastQuestion ? " Ini soal terakhir — jawaban langsung dikirim." : ""}
                  </p>
                  <button type="button" onClick={goNext} disabled={!answeredNow || busy} className={`${goldButton} w-full sm:w-auto`}>
                    {busy ? <><Spinner /> Mengirim…</> : isLastQuestion ? <>Kirim Jawaban <CheckIcon className="h-4 w-4" /></> : <>Lanjut <ArrowIcon /></>}
                  </button>
                </div>
              </div>
            </article>

            <aside className="hidden lg:block">
              <div className="sticky top-6 space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/45">Progres</p>
                    <p className="text-2xl font-black text-gold-300">{progress}%</p>
                  </div>
                  <p className="mt-2 text-xs text-white/45">{answeredCount} dari {paper.length} soal terjawab</p>
                  <div className="mt-4 grid grid-cols-5 gap-1.5">
                    {paper.map((question, index) => {
                      const filled = (answers[question.no_soal] ?? "").trim() !== "" || Boolean(fileAnswers[question.no_soal]);
                      const active = index === currentIndex;
                      return (
                        <span key={`${question.no_soal}-${index}`} aria-label={`Soal ${index + 1}${filled ? " terjawab" : ""}`}
                          className={`grid h-8 place-items-center rounded-lg text-[11px] font-black ${active ? "bg-rei-900 text-gold-300 ring-2 ring-gold-400" : filled ? "bg-gold-400 text-rei-900" : "border border-white/10 bg-white/5 text-white/35"}`}>
                          {index + 1}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl border border-amber-300/20 bg-amber-400/10 p-4 text-[11px] leading-relaxed text-amber-100/80">
                  <p className="font-black uppercase tracking-widest text-amber-200">Perhatian</p>
                  <p className="mt-1.5">Jangan menutup atau meninggalkan halaman ini. Jawabanmu akan otomatis dikirim.</p>
                </div>

                <p className="px-1 text-center text-[11px] leading-relaxed text-white/35">Soal dan pilihan diacak khusus untuk sesimu.</p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    );
  }

  /* ---------- Entry screen ---------- */
  return (
    <main className="relative min-h-dvh overflow-hidden text-white">
      <Background />
      <PortalHeader step={1} />
      <section className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_minmax(0,520px)] lg:gap-12 lg:py-12">
        <div className="exam-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/35 bg-gold-400/10 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-gold-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-300" /> Portal ujian peserta
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Satu soal,<br /><span className="exam-shimmer bg-gradient-to-r from-gold-200 via-gold-400 to-gold-200 bg-clip-text text-transparent">satu fokus.</span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/55 sm:text-base">Ketik nama lengkap atau NIP kamu, lalu masuk dengan token dari trainer. Soal tampil satu per satu dan diacak sesuai hari ujian — fokus ke soalmu sendiri.</p>

          <div className="mt-7 grid grid-cols-3 gap-2.5 sm:gap-3">
            {[{ value: "1", label: "Soal per layar" }, { value: "5", label: "Hari ujian" }, { value: "AUTO", label: "Submit saat keluar" }].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur sm:px-4">
                <p className="text-2xl font-black text-gold-300 sm:text-2xl">{item.value}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40 sm:text-[11px]">{item.label}</p>
              </div>
            ))}
          </div>

          <ul className="mt-7 hidden gap-3 text-sm text-white/60 sm:grid">
            {["Soal dan pilihan diacak per peserta sesuai day.", "Jawab satu soal dulu, baru bisa lanjut ke soal berikutnya.", "Meninggalkan halaman? Jawaban otomatis dikirim."].map((text) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300"><CheckIcon className="h-3 w-3" /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="exam-rise overflow-hidden rounded-3xl border border-gold-300/30 bg-white shadow-2xl shadow-black/40" style={{ animationDelay: "120ms" }}>
          <div className="relative overflow-hidden bg-gradient-to-br from-rei-900 via-rei-800 to-rei-900 px-5 py-5 sm:px-6">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-gold-400/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 left-10 h-28 w-28 rounded-full bg-gold-300/10 blur-xl" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gold-300/80">Masuk ujian</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white">Siap mulai?</h2>
            <p className="mt-1 text-xs text-white/50">Data peserta lain tidak ditampilkan. Cukup identitasmu sendiri.</p>
          </div>

          <div className="space-y-5 p-5 text-rei-900 sm:p-6">
            {error && <Alert>{error}</Alert>}

            <div>
              <label htmlFor="identitas-peserta" className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-rei-900/45"><span className="grid h-5 w-5 place-items-center rounded-full bg-rei-900 text-[10px] text-gold-300">1</span> Nama lengkap atau NIP</label>
              <input id="identitas-peserta" value={participantTerm} onChange={(event) => { setParticipantTerm(event.target.value); setParticipant(null); }} placeholder="Contoh: Andri Nugroho atau 12345678" autoComplete="name" className={fieldClass} />
              <p className="mt-1.5 text-[10px] leading-relaxed text-rei-900/40">Ketik persis seperti data terdaftar. Jika nama kamu sama dengan peserta lain, gunakan NIP.</p>
              {participant && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
                  <CheckIcon className="h-3.5 w-3.5" /> Peserta dikenali: {participant.nama_peserta} · {participant.nip}
                  <button type="button" onClick={() => { setParticipant(null); setParticipantTerm(""); setEmail(""); }} className="ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 underline-offset-2 hover:underline">Ganti</button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="email-peserta" className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-rei-900/45"><span className="grid h-5 w-5 place-items-center rounded-full bg-rei-900 text-[10px] text-gold-300">2</span> Email peserta</label>
              <input id="email-peserta" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@contoh.com" className={fieldClass} />
              <p className="mt-1.5 text-[10px] leading-relaxed text-rei-900/40">Boleh dikosongkan jika emailmu sudah terdaftar.</p>
            </div>

            {day === "Day 5" ? (
              <Alert kind="info">Day 5 menggunakan penilaian praktik. Pretest dan posttest tersedia untuk Day 1 sampai Day 4.</Alert>
            ) : <div>
              <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-rei-900/45"><span className="grid h-5 w-5 place-items-center rounded-full bg-rei-900 text-[10px] text-gold-300">3</span> Pilih jenis tes</p>
              <div className="grid grid-cols-2 gap-2">
                {(["pretest", "posttest"] as const).map((value) => {
                  const active = examType === value;
                  return <button key={value} type="button" aria-pressed={active} onClick={() => setExamType(value)} className={`rounded-xl border px-3 py-3 text-left transition ${active ? "border-rei-900 bg-rei-900 text-gold-200 shadow-md" : "border-rei-900/10 bg-white text-rei-900/60 hover:border-gold-400/60 hover:bg-gold-200/25"}`}>
                    <span className="block text-sm font-black">{value === "pretest" ? "Pretest" : "Posttest"}</span>
                    <span className={`mt-0.5 block text-[10px] ${active ? "text-white/60" : "text-rei-900/40"}`}>{value === "pretest" ? "Tes sebelum pelatihan" : "Tes setelah pelatihan"}</span>
                  </button>;
                })}
              </div>
            </div>}

            <div>
              <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-rei-900/45"><span className="grid h-5 w-5 place-items-center rounded-full bg-rei-900 text-[10px] text-gold-300">4</span> Hari ujian</p>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {days.map((item, index) => {
                  const active = day === item;
                  return (
                    <button key={item} type="button" aria-pressed={active} onClick={() => { setDay(item); if (item === "Day 5") setExamType("posttest"); }}
                      className={`rounded-xl border px-1 py-2 text-center transition sm:py-2.5 ${active ? "border-transparent bg-gradient-to-br from-gold-400 to-gold-600 text-rei-900 shadow-lg shadow-gold-600/25" : "border-rei-900/10 bg-white text-rei-900/55 hover:-translate-y-0.5 hover:border-gold-400/60 hover:bg-gold-200/25 hover:text-rei-900"}`}>
                      <span className="block text-[8px] font-black uppercase tracking-widest opacity-60 sm:text-[9px]">Day</span>
                      <span className="block text-lg font-black leading-tight sm:text-xl">{index + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="token-ujian" className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-rei-900/45"><span className="grid h-5 w-5 place-items-center rounded-full bg-rei-900 text-[10px] text-gold-300">5</span> Token ujian</label>
              <div className="relative">
                <input id="token-ujian" type={showToken ? "text" : "password"} value={token} onChange={(event) => setToken(event.target.value)} placeholder="Masukkan token dari trainer"
                  autoCapitalize="characters" autoComplete="off" spellCheck={false}
                  className={`${fieldClass} pr-20 font-mono uppercase tracking-[0.18em]`} />
                <button type="button" onClick={() => setShowToken((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-rei-900/45 transition hover:bg-rei-100 hover:text-rei-900" aria-label={showToken ? "Sembunyikan token" : "Tampilkan token"}>
                  {showToken ? "Sembunyi" : "Lihat"}
                </button>
              </div>
            </div>

            <button type="button" onClick={() => void openExam()} disabled={busy} className={`${goldButton} w-full`}>
              {busy ? <><Spinner /> Memeriksa…</> : <>Buka Soal Ujian <ArrowIcon /></>}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-rei-900/40">
              <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true"><rect x="4.5" y="9" width="11" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M7 9V6.5a3 3 0 016 0V9" stroke="currentColor" strokeWidth="1.6" /></svg>
              Token dibagikan trainer tepat sebelum ujian dimulai.
            </p>
          </div>
        </div>
      </section>
      <footer className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-6 text-center text-[10px] text-white/25 sm:px-6">© {new Date().getFullYear()} Raja Emas Indonesia · CBT Peserta</footer>
    </main>
  );
}
