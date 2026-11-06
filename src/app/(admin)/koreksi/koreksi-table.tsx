"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { btnGhost, btnPrimary, inputClass, Notice, Stat, TableWrap, tdClass, thClass } from "@/components/ui";

export type KoreksiRow = { id_peserta: number; nama_peserta: string; nip: string; batch: string; day: string; jumlah: number; dikoreksi: number; berkas: number; skor_auto: number; skor_final: number; total_bobot: number };
type Peserta = { id: number; nama_peserta: string; nip: string; batch: string; jabatan: string | null; cabang: string | null };
type Question = {
  id_soal: number; no_soal: number; day: string; pertanyaan: string; bobot: number; jenis_soal: string | null;
  pilihan_a: string | null; pilihan_b: string | null; pilihan_c: string | null; pilihan_d: string | null; jawaban_benar: string | null; kata_kunci: string | null; kata_kunci_bobot: string | null;
  id_jawaban: number | null; jawaban: string | null; file_path: string | null; skor_auto: number | null; nilai: number | null; is_dikoreksi: number | null; catatan_koreksi: string | null;
};
type Summary = { answered: number; corrected: number; total: number; totalFinal: number; totalAuto: number; totalBobot: number };
type Detail = { peserta: Peserta; day: string; questions: Question[]; summary: Summary };

function fileUrl(path: string) {
  return `/uploads/${path.replace(/^\/?uploads\//i, "")}`;
}
function fileKind(path: string) {
  const ext = path.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(ext)) return "image" as const;
  if (ext === "pdf") return "pdf" as const;
  return "file" as const;
}

function AttachmentPreview({ path }: { path: string }) {
  const [failed, setFailed] = useState(false);
  const url = fileUrl(path);
  const kind = fileKind(path);
  const name = path.split("/").pop() ?? "lampiran";
  const label = kind === "image" ? "Lihat gambar ukuran penuh" : kind === "pdf" ? "Buka PDF di tab baru" : "Unduh berkas";
  return (
    <div className="mt-2 rounded-lg border border-rei-900/10 bg-white p-2">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-rei-900/40">Lampiran jawaban</p>
        <a className="text-xs font-bold text-gold-600 hover:text-gold-500" href={url} target="_blank" rel="noreferrer">{label} →</a>
      </div>
      {kind === "image" && !failed && (
        <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-rei-900/10 bg-[#faf8fa]" title={name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Lampiran jawaban ${name}`} onError={() => setFailed(true)} className="mx-auto max-h-[380px] w-auto max-w-full object-contain" />
        </a>
      )}
      {kind === "pdf" && (
        <object data={url} type="application/pdf" className="h-[380px] w-full rounded-lg border border-rei-900/10 bg-[#faf8fa]">
          <p className="p-3 text-xs text-rei-900/50">Pratinjau PDF tidak tersedia di peramban ini. <a className="font-bold text-gold-600" href={url} target="_blank" rel="noreferrer">Buka PDF</a>.</p>
        </object>
      )}
      {(kind === "file" || failed) && (
        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-[#faf8fa] px-3 py-2.5 text-sm font-semibold text-rei-900 transition hover:bg-gold-200/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gold-600" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>
          <span className="truncate">{name}</span>
        </a>
      )}
      {failed && <p className="mt-1.5 text-[11px] font-semibold text-rose-700">Berkas tidak dapat dimuat — kemungkinan data lama yang filenya tidak ada di server. Coba unduh lewat tautan di atas.</p>}
      <p className="mt-1 truncate font-mono text-[10px] text-rei-900/40">{name}</p>
    </div>
  );
}

export default function KoreksiTable({ rows, initialOpen }: { rows: KoreksiRow[]; initialOpen?: { peserta: number; day?: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [scores, setScores] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setDetail(null);
    setError("");
    setNotice("");
    setSaving(false);
    if (initialOpen) window.history.replaceState(null, "", "/koreksi");
  }, [initialOpen]);

  const load = useCallback(async (idPeserta: number, day?: string) => {
    setOpen(true);
    setLoading(true);
    setError("");
    setNotice("");
    setDetail(null);
    try {
      const params = new URLSearchParams({ peserta: String(idPeserta) });
      if (day) params.set("day", day);
      const response = await fetch(`/api/koreksi/detail?${params.toString()}`, { cache: "no-store" });
      const data = await response.json() as { success?: boolean; message?: string } & Partial<Detail>;
      if (!response.ok || !data.success || !data.questions) throw new Error(data.message ?? "Gagal memuat detail.");
      const nextScores: Record<number, string> = {};
      const nextNotes: Record<number, string> = {};
      for (const question of data.questions) {
        nextScores[question.id_soal] = Number(question.is_dikoreksi) === 1
          ? String(question.nilai ?? "")
          : Number(question.skor_auto) > 0
            ? String(question.skor_auto)
            : Number(question.nilai) > 0 ? String(question.nilai) : "";
        nextNotes[question.id_soal] = question.catatan_koreksi ?? "";
      }
      setDetail({ peserta: data.peserta!, day: data.day!, questions: data.questions, summary: data.summary! });
      setSummary(data.summary!);
      setScores(nextScores);
      setNotes(nextNotes);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat detail koreksi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialOpen?.peserta) void load(initialOpen.peserta, initialOpen.day);
  }, [initialOpen?.peserta, initialOpen?.day, load]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [open, close]);

  const liveTotal = useMemo(() => {
    if (!detail) return 0;
    return detail.questions.reduce((sum, question) => sum + (Number(scores[question.id_soal]) || 0), 0);
  }, [detail, scores]);

  async function save() {
    if (!detail) return;
    const items = detail.questions
      .map((question) => ({ id_soal: question.id_soal, nilai: scores[question.id_soal] ?? "", catatan: notes[question.id_soal] ?? "" }))
      .filter((item) => String(item.nilai).trim() !== "");
    if (!items.length) { setError("Isi minimal satu nilai sebelum menyimpan."); return; }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/koreksi/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_peserta: detail.peserta.id, day: detail.day, items }) });
      const data = await response.json() as { success?: boolean; message?: string; summary?: Summary };
      if (!response.ok || !data.success) throw new Error(data.message ?? "Gagal menyimpan koreksi.");
      setNotice(data.message ?? "Koreksi berhasil disimpan.");
      if (data.summary) setSummary(data.summary);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan koreksi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TableWrap>
        <thead className="border-b border-rei-900/10"><tr>{["Peserta", "NIP", "Batch", "Day", "Jawaban", "Auto", "Final", "Status", "Aksi"].map((head) => <th key={head} className={thClass}>{head}</th>)}</tr></thead>
        <tbody className="divide-y divide-rei-900/10">
          {rows.map((row) => {
            const complete = row.dikoreksi >= row.jumlah;
            return (
              <tr key={`${row.id_peserta}-${row.day}`} className="hover:bg-gold-200/15">
                <td className={`${tdClass} font-semibold`}>{row.nama_peserta}</td>
                <td className={`${tdClass} font-mono text-xs`}>{row.nip}</td>
                <td className={tdClass}>{row.batch}</td>
                <td className={`${tdClass} whitespace-nowrap`}>{row.day}</td>
                <td className={tdClass}>
                  <span className="inline-flex items-center gap-1.5">
                    {row.dikoreksi}/{row.jumlah}
                    {Number(row.berkas) > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold-200/60 px-1.5 py-0.5 text-[10px] font-bold text-gold-600" title={`${Number(row.berkas)} jawaban berupa berkas/gambar`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true"><path d="m21.4 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                        {Number(row.berkas)}
                      </span>
                    )}
                  </span>
                </td>
                <td className={tdClass}>{Number(row.skor_auto)}</td>
                <td className={`${tdClass} font-bold`}>{Number(row.skor_final)}<span className="text-xs font-normal text-rei-900/40"> / {Number(row.total_bobot)}</span></td>
                <td className={tdClass}><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${complete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{complete ? "Sudah dikoreksi" : "Menunggu"}</span></td>
                <td className={tdClass}><button type="button" className={btnGhost} onClick={() => void load(row.id_peserta, row.day)}>Koreksi</button></td>
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-rei-900/50">Tidak ada jawaban untuk filter ini.</td></tr>}
        </tbody>
      </TableWrap>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-rei-950/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) close(); }}>
          <div role="dialog" aria-modal="true" aria-label="Koreksi jawaban" className="my-2 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gold-500/30 bg-[#f6f3f6] shadow-2xl sm:my-4">
            <header className="flex items-start justify-between gap-3 border-b border-rei-900/10 bg-gradient-to-r from-rei-900 to-rei-800 px-5 py-4 text-white">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-500">Koreksi Jawaban</p>
                <h2 className="truncate text-lg font-extrabold">{detail?.peserta.nama_peserta ?? "Memuat…"}</h2>
                {detail && <p className="mt-0.5 truncate text-xs text-white/60">{detail.peserta.nip}{detail.peserta.jabatan ? ` · ${detail.peserta.jabatan}` : ""}{detail.peserta.batch ? ` · Batch ${detail.peserta.batch}` : ""} · {detail.day}</p>}
              </div>
              <button type="button" onClick={close} disabled={saving} className="rounded-lg bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white" aria-label="Tutup">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {loading && <div className="py-16 text-center text-sm text-rei-900/50">Memuat jawaban peserta…</div>}
              {!loading && error && !detail && <Notice kind="error">{error}</Notice>}
              {!loading && detail && (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <Stat label="Dijawab" value={`${summary?.answered ?? 0}/${summary?.total ?? 0}`} />
                    <Stat label="Dikoreksi" value={`${summary?.corrected ?? 0}/${summary?.total ?? 0}`} />
                    <Stat label="Skor auto" value={summary?.totalAuto ?? 0} />
                    <Stat label="Total nilai" value={`${liveTotal} / ${summary?.totalBobot ?? 0}`} />
                  </div>

                  {notice && <Notice kind="success">{notice}</Notice>}
                  {error && <Notice kind="error">{error}</Notice>}

                  <div className="space-y-3">
                    {detail.questions.map((question, index) => {
                      const isMcq = question.jenis_soal === "pilihan_ganda";
                      const selected = (question.jawaban ?? "").trim().toUpperCase();
                      const isCorrect = isMcq && selected && selected === (question.jawaban_benar ?? "").toUpperCase();
                      return (
                        <section key={question.id_soal} className={`rounded-xl border bg-white p-4 shadow-sm ${Number(question.is_dikoreksi) === 1 ? "border-emerald-200" : "border-rei-900/10"}`}>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="grid h-6 min-w-6 place-items-center rounded-md bg-rei-900 px-1.5 text-[11px] font-extrabold text-gold-400">{index + 1}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isMcq ? "bg-gold-200 text-gold-600" : "bg-rei-100 text-rei-900/70"}`}>{isMcq ? "Pilihan ganda" : "Esai"}</span>
                            <span className="text-[11px] text-rei-900/45">No. {question.no_soal} · Bobot {question.bobot}</span>
                            {Number(question.is_dikoreksi) === 1 && <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Sudah dinilai</span>}
                            {question.id_jawaban === null && <span className="ml-auto rounded-full bg-rei-100 px-2 py-0.5 text-[10px] font-bold text-rei-900/50">Tidak dijawab</span>}
                          </div>

                          <p className="text-sm font-medium leading-relaxed text-rei-900">{question.pertanyaan}</p>

                          {isMcq && (
                            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                              {(["A", "B", "C", "D"] as const).map((letter) => {
                                const text = question[`pilihan_${letter.toLowerCase()}` as "pilihan_a"];
                                const isKey = question.jawaban_benar === letter;
                                const isPicked = selected === letter;
                                return <div key={letter} className={`rounded-lg border px-2.5 py-1.5 text-xs ${isKey ? "border-emerald-300 bg-emerald-50 text-emerald-800" : isPicked ? "border-rose-300 bg-rose-50 text-rose-700" : "border-rei-900/10 text-rei-900/70"}`}><b>{letter}.</b> {text} {isKey && <span className="font-bold">✓ kunci</span>} {isPicked && <span className="font-bold">← dipilih</span>}</div>;
                              })}
                            </div>
                          )}

                          <div className="mt-2 rounded-lg bg-[#faf8fa] p-2.5">
                            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-rei-900/40">Jawaban peserta</p>
                            {question.jawaban ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-rei-900/85">{question.jawaban}</p> : <p className="text-sm italic text-rei-900/35">{question.file_path ? "Jawaban berupa berkas — lihat lampiran di bawah." : "Tidak ada jawaban."}</p>}
                            {question.file_path && <AttachmentPreview path={question.file_path} />}
                            {isMcq && question.id_jawaban !== null && <p className={`mt-1 text-[11px] font-bold ${isCorrect ? "text-emerald-700" : "text-rose-700"}`}>{isCorrect ? "Sesuai kunci." : "Tidak sesuai kunci."}</p>}
                            {!isMcq && (question.kata_kunci_bobot || question.kata_kunci) && <p className="mt-1 text-[11px] text-rei-900/50"><b>Kata kunci:</b> {question.kata_kunci_bobot || question.kata_kunci}</p>}
                            {!isMcq && Number(question.skor_auto) > 0 && <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">Nilai otomatis dari kata kunci: {Number(question.skor_auto)}</p>}
                          </div>

                          <div className="mt-2 grid gap-2 sm:grid-cols-[120px_1fr]">
                            <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-rei-900/50">Nilai (0–{question.bobot})
                              <input className={inputClass} type="number" min="0" max={question.bobot} step="0.5" placeholder="0" value={scores[question.id_soal] ?? ""} onChange={(event) => setScores((current) => ({ ...current, [question.id_soal]: event.target.value }))} />
                            </label>
                            <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-rei-900/50">Catatan (opsional)
                              <input className={inputClass} placeholder="Catatan untuk peserta / alasan nilai" value={notes[question.id_soal] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [question.id_soal]: event.target.value }))} />
                            </label>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-rei-900/10 bg-white px-5 py-3.5">
              <p className="text-sm text-rei-900/60">Total nilai: <b className="text-rei-900">{liveTotal}</b> dari {summary?.totalBobot ?? 0}</p>
              <div className="flex items-center gap-2">
                <button type="button" className={btnGhost} onClick={close} disabled={saving}>Tutup</button>
                <button type="button" className={btnPrimary} onClick={() => void save()} disabled={saving || loading || !detail}>{saving ? "Menyimpan…" : "Simpan Koreksi"}</button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
