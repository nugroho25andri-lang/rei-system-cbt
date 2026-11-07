"use client";

import { useEffect, useState } from "react";
import { TRAINER_CRITERIA, formatDuration, formatTanggal, type TrainerCriterionKey } from "@/lib/trainer-evaluation-shared";

export type SessionRow = {
  id_peserta: number;
  nip: string;
  nama_peserta: string;
  batch: string;
  trainer: string;
  day_ke: number;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  durasi_menit: number;
  rata_rata: number;
  hal_terbaik: string;
  perbaikan: string;
  sumber: string;
  created_at: string;
  scores: Record<TrainerCriterionKey, number>;
};

const PAGE_SIZE = 15;

export default function SessionTable({ rows }: { rows: SessionRow[] }) {
  const [selected, setSelected] = useState<SessionRow | null>(null);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-rei-900/10">
              {["Tanggal", "Trainer", "Peserta", "Jam mengajar", "Durasi", "Rata-rata", ""].map((head) => (
                <th key={head} className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-rei-900/55">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-rei-900/10">
            {visible.map((row, index) => {
              const key = `${row.id_peserta}-${row.trainer}-${row.tanggal}-${row.jam_mulai}-${index}`;
              return (
                <tr key={key} className="hover:bg-gold-200/15">
                  <td className="px-3 py-2.5 align-top">
                    <span className="block whitespace-nowrap font-semibold">{formatTanggal(row.tanggal)}</span>
                    <span className="text-[11px] text-rei-900/50">Hari ke-{row.day_ke} · Batch {row.batch}</span>
                  </td>
                  <td className="px-3 py-2.5 align-top font-semibold">{row.trainer}</td>
                  <td className="px-3 py-2.5 align-top">
                    <span className="block font-semibold">{row.nama_peserta || "-"}</span>
                    <span className="font-mono text-[11px] text-rei-900/50">{row.nip}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-top text-rei-900/75">{row.jam_mulai}–{row.jam_selesai}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-top text-rei-900/75">{formatDuration(row.durasi_menit)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-top">
                    <span className={`rounded-full px-2 py-1 text-xs font-extrabold ${row.rata_rata >= 4.5 ? "bg-emerald-50 text-emerald-700" : row.rata_rata >= 4 ? "bg-gold-200/70 text-rei-900" : row.rata_rata >= 3.5 ? "bg-amber-100 text-amber-800" : "bg-rose-50 text-rose-700"}`}>
                      {row.rata_rata.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <button type="button" onClick={() => setSelected(row)} className="rounded-lg border border-rei-900/15 bg-white px-3 py-1.5 text-xs font-bold text-rei-900 transition hover:border-gold-500 hover:bg-gold-200/40">
                      Detail
                    </button>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-rei-900/50">Belum ada penilaian untuk filter ini.</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-xs font-semibold">
          <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-rei-900/15 px-3 py-1.5 disabled:opacity-40">← Sebelumnya</button>
          <span className="text-rei-900/60">Halaman {currentPage} dari {totalPages}</span>
          <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-rei-900/15 px-3 py-1.5 disabled:opacity-40">Berikutnya →</button>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-rei-950/60 p-4" role="dialog" aria-modal="true" aria-label="Detail penilaian trainer" onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-rei-900/10 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-start justify-between gap-3 border-b border-rei-900/10 px-5 py-4">
              <div>
                <h2 className="text-base font-extrabold text-rei-900">Detail Penilaian · {selected.trainer}</h2>
                <p className="text-xs text-rei-900/55">
                  {formatTanggal(selected.tanggal)} · Hari ke-{selected.day_ke} · {selected.jam_mulai}–{selected.jam_selesai} ({formatDuration(selected.durasi_menit)})
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-rei-900/15 px-2.5 py-1 text-sm font-bold text-rei-900/60 hover:bg-rei-100" aria-label="Tutup">✕</button>
            </header>
            <div className="space-y-5 px-5 py-4">
              <div className="grid gap-2 rounded-xl border border-rei-900/10 bg-rei-100/30 px-4 py-3 text-xs sm:grid-cols-3">
                <p><span className="block text-rei-900/50">Peserta</span><b className="text-rei-900">{selected.nama_peserta || "-"}</b></p>
                <p><span className="block text-rei-900/50">NIP</span><b className="font-mono text-rei-900">{selected.nip}</b></p>
                <p><span className="block text-rei-900/50">Batch / sumber</span><b className="text-rei-900">Batch {selected.batch} · {selected.sumber}</b></p>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-extrabold text-rei-900">Nilai 10 aspek</h3>
                <ul className="space-y-2">
                  {TRAINER_CRITERIA.map((criterion, index) => {
                    const value = selected.scores[criterion.key] ?? 0;
                    return (
                      <li key={criterion.key} className="flex items-center gap-3">
                        <span className="w-44 shrink-0 text-xs font-semibold text-rei-900/75">{index + 1}. {criterion.label}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-rei-900/10">
                          <span className={`block h-full rounded-full ${value >= 4 ? "bg-emerald-500" : value >= 3 ? "bg-gold-500" : "bg-rose-500"}`} style={{ width: `${(value / 5) * 100}%` }} />
                        </span>
                        <b className={`w-10 text-right text-sm ${value >= 4 ? "text-emerald-700" : value >= 3 ? "text-rei-900" : "text-rose-700"}`}>{value}/5</b>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">Hal terbaik</p>
                  <p className="mt-1 text-sm text-emerald-900/90 whitespace-pre-line">{selected.hal_terbaik || "Tidak diisi."}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">Perlu ditingkatkan</p>
                  <p className="mt-1 text-sm text-amber-900/90 whitespace-pre-line">{selected.perbaikan || "Tidak diisi."}</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-rei-900/10 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wide text-rei-900/55">Rata-rata penilaian</span>
                <b className="text-xl font-extrabold text-rei-900">{selected.rata_rata.toFixed(2)} / 5</b>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
