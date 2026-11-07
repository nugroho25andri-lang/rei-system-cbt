"use client";

import { useEffect, useMemo, useState } from "react";
import { btnPrimary, Card, inputClass, selectClass } from "@/components/ui";
import { submitTrainerEvaluationAction } from "@/lib/trainer-evaluation-actions";
import {
  SCORE_LABELS,
  SCORE_VALUES,
  TRAINER_CRITERIA,
  durationMinutes,
  formatDuration,
  formatTanggal,
  formatTanggalShort,
  todayJakarta,
  type EvaluationFormState,
} from "@/lib/trainer-evaluation-shared";

type ScheduleEntry = { dayKe: number; tanggal: string; jamMulai: string; jamSelesai: string; materi: string };
type FormContext = {
  batchLabel: string;
  trainers: string[];
  days: Array<{ dayKe: number; tanggal: string; slots: Array<{ trainer: string; jamMulai: string; jamSelesai: string; materi: string }> }>;
  schedule: Record<string, ScheduleEntry[]>;
};
type HistoryRow = { id: number; trainer: string; dayKe: number; tanggal: string; jamMulai: string; jamSelesai: string; durasi: number; rataRata: number };

export default function TrainerEvaluationForm({
  mode,
  evaluatorLabel,
  context,
  history = [],
  showHistory = true,
  initialCode = "",
}: {
  mode: "portal" | "kode";
  evaluatorLabel: string;
  context: FormContext;
  history?: HistoryRow[];
  showHistory?: boolean;
  initialCode?: string;
}) {
  const [state, setState] = useState<EvaluationFormState>(null);
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [trainer, setTrainer] = useState("");
  const [dayKe, setDayKe] = useState(String(context.days[0]?.dayKe ?? 1));
  const [tanggal, setTanggal] = useState(context.days[0]?.tanggal || todayJakarta());
  const [jamMulai, setJamMulai] = useState("");
  const [jamSelesai, setJamSelesai] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});

  const dayOptions = useMemo(() => context.days.map((day) => ({
    value: day.dayKe,
    date: day.tanggal,
    label: day.tanggal ? `Hari ${day.dayKe} · ${formatTanggal(day.tanggal)}` : `Hari ${day.dayKe}`,
  })), [context.days]);

  useEffect(() => {
    if (!trainer) return;
    const entries = context.schedule[trainer] ?? [];
    const match = entries.find((entry) => entry.dayKe === Number(dayKe));
    if (!match) return;
    setJamMulai(match.jamMulai);
    setJamSelesai(match.jamSelesai);
    if (match.tanggal) setTanggal(match.tanggal);
  }, [trainer, dayKe, context.schedule]);

  useEffect(() => {
    if (!tanggal) {
      const match = context.days.find((day) => day.dayKe === Number(dayKe));
      if (match?.tanggal) setTanggal(match.tanggal);
    }
  }, [dayKe, context.days, tanggal]);

  const answered = TRAINER_CRITERIA.filter((criterion) => scores[criterion.key] > 0).length;
  const average = answered ? Object.values(scores).reduce((sum, value) => sum + value, 0) / answered : 0;
  const duration = durationMinutes(jamMulai, jamSelesai);
  const scheduleHint = trainer && dayKe ? (context.schedule[trainer] ?? []).filter((entry) => entry.dayKe === Number(dayKe)) : [];
  const success = state?.ok && state.success && !dismissed;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    setPending(true);
    try {
      const result = await submitTrainerEvaluationAction(null, formData);
      setState(result);
      if (result?.ok) setScores({});
    } catch {
      setState({ ok: false, error: "Penilaian gagal dikirim. Periksa koneksi lalu coba lagi." });
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
        <h2 className="text-lg font-extrabold text-emerald-900">Penilaian terkirim</h2>
        <p className="mt-1 text-sm text-emerald-800">{state.success}</p>
        <button type="button" className={`${btnPrimary} mt-4`} onClick={() => { setDismissed(true); setScores({}); setFormKey((value) => value + 1); }}>
          Isi penilaian trainer lain
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {state?.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{state.error}</p>}

      <Card
        title="Form Penilaian Trainer"
        description={`${context.batchLabel} · penilaian diisi setiap hari setelah sesi trainer selesai · skala 1–5`}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold-300 bg-gold-200/50 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wide text-rei-900/60">Identitas penilai</span>
          <span className="font-mono text-sm font-extrabold tracking-[0.3em] text-rei-900">{evaluatorLabel}</span>
        </div>

        <form key={formKey} onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="mode" value={mode} />
          {mode === "kode" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-bold text-rei-900/70">
                Kode akses
                <input name="kode_akses" className={inputClass} required placeholder="Contoh: B43-26-08-55" autoComplete="off" defaultValue={initialCode} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-rei-900/70">
                NIP peserta
                <input name="nip" className={inputClass} required placeholder="Masukkan NIP" autoComplete="off" inputMode="numeric" />
              </label>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-xs font-bold text-rei-900/70">
              Nama trainer *
              <select name="trainer" className={selectClass} required value={trainer} onChange={(event) => setTrainer(event.target.value)}>
                <option value="">Pilih trainer</option>
                {context.trainers.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-rei-900/70">
              Hari ke *
              <select name="day_ke" className={selectClass} required value={dayKe} onChange={(event) => setDayKe(event.target.value)}>
                {dayOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-rei-900/70">
              Tanggal mengajar *
              <input name="tanggal" type="date" className={inputClass} required max={todayJakarta()} value={tanggal} onChange={(event) => setTanggal(event.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs font-bold text-rei-900/70">
                Jam mulai *
                <input name="jam_mulai" type="time" className={inputClass} required value={jamMulai} onChange={(event) => setJamMulai(event.target.value)} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-rei-900/70">
                Jam selesai *
                <input name="jam_selesai" type="time" className={inputClass} required value={jamSelesai} onChange={(event) => setJamSelesai(event.target.value)} />
              </label>
            </div>
          </div>

          {scheduleHint.length > 0 && (
            <div className="rounded-xl border border-rei-900/10 bg-rei-100/40 px-4 py-3 text-xs text-rei-900/70">
              <p className="mb-1 font-bold text-rei-900/60">Jadwal rundown pada hari ini</p>
              <ul className="space-y-1">
                {scheduleHint.map((entry, index) => (
                  <li key={`${entry.jamMulai}-${index}`}>
                    <span className="font-semibold text-rei-900">{entry.jamMulai}–{entry.jamSelesai}</span> · {entry.materi || "Sesi materi"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-rei-900/10 bg-white px-4 py-2.5 text-xs font-semibold text-rei-900/60">
            <span>Durasi mengajar: <b className="text-rei-900">{formatDuration(duration)}</b></span>
            <span>{answered}/{TRAINER_CRITERIA.length} aspek dinilai{average > 0 ? ` · rata-rata ${average.toFixed(2)}/5` : ""}</span>
          </div>

          <div className="space-y-3">
            {TRAINER_CRITERIA.map((criterion, index) => (
              <fieldset key={criterion.key} className="rounded-xl border border-rei-900/10 bg-white px-4 py-3">
                <legend className="sr-only">{criterion.label}</legend>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-rei-900">{index + 1}. {criterion.label}</p>
                    <p className="text-xs text-rei-900/60">{criterion.question}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SCORE_VALUES.map((value) => {
                      const checked = scores[criterion.key] === value;
                      return (
                        <label
                          key={value}
                          title={SCORE_LABELS[value]}
                          className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${checked ? "border-gold-500 bg-gold-500 text-rei-900 shadow-sm" : "border-rei-900/15 bg-white text-rei-900/60 hover:border-gold-500 hover:bg-gold-200/40"}`}
                        >
                          <input
                            type="radio"
                            name={criterion.key}
                            value={value}
                            required
                            checked={checked}
                            className="sr-only"
                            onChange={() => setScores((current) => ({ ...current, [criterion.key]: value }))}
                          />
                          {value}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </fieldset>
            ))}
          </div>
          <p className="text-[11px] text-rei-900/50">Skala: 1 = {SCORE_LABELS[1]}, 2 = {SCORE_LABELS[2]}, 3 = {SCORE_LABELS[3]}, 4 = {SCORE_LABELS[4]}, 5 = {SCORE_LABELS[5]}.</p>

          <label className="grid gap-1 text-xs font-bold text-rei-900/70">
            Apa hal terbaik dari sesi pembelajaran hari ini?
            <textarea name="hal_terbaik" rows={3} maxLength={2000} className={inputClass} placeholder="Tuliskan hal terbaik yang Anda rasakan dari sesi hari ini." />
          </label>
          <label className="grid gap-1 text-xs font-bold text-rei-900/70">
            Apa yang perlu ditingkatkan oleh trainer?
            <textarea name="perbaikan" rows={3} maxLength={2000} className={inputClass} placeholder="Tuliskan saran perbaikan untuk trainer." />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-rei-900/50">Nama penilai disensor. Pastikan trainer, hari, tanggal, dan jam sudah sesuai.</p>
            <button type="submit" className={btnPrimary} disabled={pending}>{pending ? "Mengirim…" : "Submit penilaian"}</button>
          </div>
        </form>
      </Card>

      {showHistory && (
        <Card title="Riwayat penilaian saya" description="Penilaian yang sudah dikirim dari akun ini">
          {history.length === 0 ? (
            <p className="text-sm text-rei-900/55">Belum ada penilaian yang dikirim.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-rei-900/10 text-[11px] uppercase tracking-wide text-rei-900/55">
                    <th className="px-2 py-2 text-left">Trainer</th>
                    <th className="px-2 py-2 text-left">Hari / tanggal</th>
                    <th className="px-2 py-2 text-left">Jam</th>
                    <th className="px-2 py-2 text-right">Durasi</th>
                    <th className="px-2 py-2 text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rei-900/10">
                  {history.map((row) => (
                    <tr key={row.id}>
                      <td className="px-2 py-2 font-semibold">{row.trainer}</td>
                      <td className="px-2 py-2 text-rei-900/70">Hari {row.dayKe} · {formatTanggalShort(row.tanggal)}</td>
                      <td className="px-2 py-2 text-rei-900/70">{row.jamMulai}–{row.jamSelesai}</td>
                      <td className="px-2 py-2 text-right text-rei-900/70">{formatDuration(row.durasi)}</td>
                      <td className="px-2 py-2 text-right font-bold">{row.rataRata.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
