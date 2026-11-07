"use client";

import { useEffect, useState } from "react";
import { deleteSoalAction, updateSoalAction } from "./actions";
import KeywordEditor, { type KeywordDraft } from "@/components/keyword-editor";
import { btnDanger, btnGhost, btnPrimary, inputClass, selectClass, TableWrap, tdClass, thClass } from "@/components/ui";

export type Question = {
  id: number;
  day: string;
  jenis_tes: "pretest" | "posttest";
  no_soal: number;
  pertanyaan: string;
  kata_kunci: string;
  bobot: number;
  waktu_soal: number;
  jenis_soal: "esai" | "pilihan_ganda" | "upload";
  pilihan_a: string | null;
  pilihan_b: string | null;
  pilihan_c: string | null;
  pilihan_d: string | null;
  jawaban_benar: string | null;
  gambar: string | null;
  keywords: Array<{ kata_kunci: string; bobot: number }>;
};

function initialKeywords(question: Question): KeywordDraft[] {
  if (question.keywords?.length) {
    return question.keywords.map((keyword) => ({ kata_kunci: keyword.kata_kunci, bobot: String(keyword.bobot) }));
  }
  const parts = question.kata_kunci.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return [{ kata_kunci: "", bobot: "1" }];
  const weight = Math.round((question.bobot / parts.length) * 100) / 100;
  return parts.map((part) => ({ kata_kunci: part, bobot: String(weight) }));
}

const label = "grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-rei-900/60";
const LETTERS = ["A", "B", "C", "D"] as const;
const toggleBase = "rounded-lg border px-3 py-1.5 text-xs font-bold transition";

function imageSrc(value: string) {
  const raw = value.trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.includes("uploads/")) return `/${raw.replace(/^\/+/, "")}`;
  return `/uploads/${encodeURIComponent(raw)}`;
}

function typeLabel(value: Question["jenis_soal"]) {
  if (value === "pilihan_ganda") return "Pilihan ganda";
  if (value === "upload") return "Upload file";
  return "Esai";
}

function EditModal({ question, days, onClose }: { question: Question; days: string[]; onClose: () => void }) {
  const [jenis, setJenis] = useState<"esai" | "pilihan_ganda" | "upload">(question.jenis_soal);
  const [hasImage, setHasImage] = useState(Boolean(question.gambar));
  const [imageName, setImageName] = useState("");
  const [preview, setPreview] = useState<string | null>(question.gambar ? imageSrc(question.gambar) : null);
  const [bobotValue, setBobotValue] = useState(String(question.bobot));
  const [keywords, setKeywords] = useState<KeywordDraft[]>(() => initialKeywords(question));

  function pickImage(file: File | undefined) {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    if (!file) {
      setPreview(question.gambar ? imageSrc(question.gambar) : null);
      setImageName("");
      return;
    }
    setImageName(file.name);
    setPreview(URL.createObjectURL(file));
  }

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-rei-900/55 p-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="edit-soal-title" className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-rei-900/10 px-5 py-4">
          <div>
            <h2 id="edit-soal-title" className="text-[15px] font-bold text-rei-900">Edit Soal #{question.id}</h2>
            <p className="mt-0.5 text-xs text-rei-900/50">{question.day} · nomor {question.no_soal}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-rei-900/10 px-2.5 py-1 text-sm font-bold text-rei-900/60 transition hover:bg-rei-900/5" aria-label="Tutup">✕</button>
        </div>

        <form action={updateSoalAction} encType="multipart/form-data" className="grid gap-4 p-5 sm:grid-cols-2">
          <input name="id" type="hidden" value={question.id} />
          <input name="hapus_gambar" type="hidden" value={hasImage ? "0" : "1"} />
          <label className={label}>Day<select name="day" defaultValue={question.day} className={selectClass}>{days.map((day) => <option key={day}>{day}</option>)}</select></label>
          <label className={label}>Jenis tes<select name="jenis_tes" defaultValue={question.jenis_tes} className={selectClass}><option value="pretest">Pretest</option><option value="posttest">Posttest</option></select></label>
          <label className={label}>Nomor soal<input className={inputClass} name="no_soal" type="number" min="1" defaultValue={question.no_soal} required /></label>
          <label className={label}>Jenis soal<select name="jenis_soal" className={selectClass} value={jenis} onChange={(event) => setJenis(event.target.value as typeof jenis)}><option value="esai">Esai</option><option value="pilihan_ganda">Pilihan ganda</option><option value="upload">Upload file</option></select></label>
          <label className={label}>Bobot<input className={inputClass} name="bobot" type="number" min="1" value={bobotValue} onChange={(event) => setBobotValue(event.target.value)} required /></label>
          <label className={label}>Waktu soal (detik)<input className={inputClass} name="waktu_soal" type="number" min="0" max="86400" defaultValue={question.waktu_soal} required /></label>
          <label className={`${label} sm:col-span-2`}>Pertanyaan<textarea className={inputClass} name="pertanyaan" rows={3} defaultValue={question.pertanyaan} required /></label>

          <div className="rounded-xl border border-rei-900/10 bg-[#faf8fa] p-3.5 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rei-900/60">Gambar soal</p>
                <p className="mt-0.5 text-[11px] text-rei-900/45">{hasImage ? "Pilih berkas baru untuk mengganti gambar." : "Soal ini tanpa gambar."}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" aria-pressed={!hasImage} onClick={() => { setHasImage(false); setImageName(""); setPreview(null); }} className={`${toggleBase} ${!hasImage ? "border-rei-900 bg-rei-900 text-gold-300" : "border-rei-900/15 bg-white text-rei-900/60 hover:border-gold-400"}`}>Tanpa gambar</button>
                <button type="button" aria-pressed={hasImage} onClick={() => { setHasImage(true); setPreview(question.gambar ? imageSrc(question.gambar) : null); }} className={`${toggleBase} ${hasImage ? "border-rei-900 bg-rei-900 text-gold-300" : "border-rei-900/15 bg-white text-rei-900/60 hover:border-gold-400"}`}>Dengan gambar</button>
              </div>
            </div>
            {hasImage && (
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px]">
                <div>
                  <input type="file" name="gambar" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => pickImage(event.target.files?.[0])} className="block w-full cursor-pointer rounded-lg border border-rei-900/15 bg-white px-3 py-2 text-xs text-rei-900 file:mr-3 file:rounded-md file:border-0 file:bg-rei-900 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-gold-300" />
                  <p className="mt-1.5 text-[11px] text-rei-900/45">PNG, JPG, WebP, atau GIF. Maksimal 5 MB.{imageName ? ` Dipilih: ${imageName}` : ""}</p>
                </div>
                <div className="grid h-24 place-items-center overflow-hidden rounded-lg border border-dashed border-rei-900/20 bg-white">
                  {preview ? <img src={preview} alt="Pratinjau gambar soal" className="h-full w-full object-contain" /> : <span className="text-[11px] text-rei-900/35">Belum ada gambar</span>}
                </div>
              </div>
            )}
          </div>

          {jenis === "pilihan_ganda" ? (
            <>
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                {LETTERS.map((letter, index) => (
                  <label key={letter} className={label}>Pilihan {letter}<input className={inputClass} name={`pilihan_${letter.toLowerCase()}`} defaultValue={[question.pilihan_a, question.pilihan_b, question.pilihan_c, question.pilihan_d][index] ?? ""} required /></label>
                ))}
              </div>
              <label className={label}>Kunci jawaban<select name="jawaban_benar" className={selectClass} defaultValue={question.jawaban_benar ?? "A"}>{LETTERS.map((letter) => <option key={letter} value={letter}>{letter}</option>)}</select></label>
            </>
          ) : jenis === "upload" ? (
            <p className="rounded-lg border border-gold-500/30 bg-gold-200/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-rei-900/65 sm:col-span-2">Peserta akan mengunggah berkas jawaban (Excel .xlsx/.xls, PDF, atau PNG) maksimal 8 MB.</p>
          ) : (
            <KeywordEditor rows={keywords} onChange={setKeywords} bobot={Number(bobotValue) || 0} />
          )}

          <div className="flex items-center justify-end gap-2 border-t border-rei-900/10 pt-4 sm:col-span-2">
            <button type="button" onClick={onClose} className={btnGhost}>Batal</button>
            <button type="submit" className={btnPrimary}>Simpan Perubahan</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function QuestionManager({ questions, days }: { questions: Question[]; days: string[] }) {
  const [editing, setEditing] = useState<Question | null>(null);

  return (
    <>
      <TableWrap>
        <thead className="border-b border-rei-900/10">
          <tr>{["Day", "Tes", "No", "Jenis", "Pertanyaan", "Kunci / Kata kunci", "Bobot", "Waktu", "Aksi"].map((head) => <th key={head} className={thClass}>{head}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-rei-900/10">
          {questions.map((row) => (
            <tr key={row.id} className="hover:bg-gold-200/15">
              <td className={`${tdClass} whitespace-nowrap font-semibold`}>{row.day}</td>
              <td className={tdClass}><span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${row.jenis_tes === "pretest" ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700"}`}>{row.jenis_tes === "pretest" ? "Pretest" : "Posttest"}</span></td>
              <td className={tdClass}>{row.no_soal}</td>
              <td className={tdClass}><span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${row.jenis_soal === "pilihan_ganda" ? "bg-gold-200 text-gold-600" : row.jenis_soal === "upload" ? "bg-emerald-100 text-emerald-700" : "bg-rei-100 text-rei-900/70"}`}>{typeLabel(row.jenis_soal)}</span></td>
              <td className={`${tdClass} max-w-[420px]`}>
                {row.pertanyaan}
                {row.gambar && (
                  <a href={imageSrc(row.gambar)} target="_blank" rel="noreferrer" className="mt-2 block w-fit" title="Buka gambar">
                    <img src={imageSrc(row.gambar)} alt="Gambar soal" loading="lazy" className="h-16 w-24 rounded-lg border border-rei-900/10 object-cover" />
                  </a>
                )}
                {row.jenis_soal === "pilihan_ganda" && (
                  <details className="mt-1.5 text-xs">
                    <summary className="cursor-pointer font-semibold text-gold-600">Lihat pilihan</summary>
                    <ol type="A" className="mt-1.5 space-y-1 pl-5 text-rei-900/70">
                      {[row.pilihan_a, row.pilihan_b, row.pilihan_c, row.pilihan_d].map((choice, index) => (
                        <li key={index} className={row.jawaban_benar === "ABCD"[index] ? "font-bold text-emerald-700" : undefined}>{choice}{row.jawaban_benar === "ABCD"[index] && " ✓"}</li>
                      ))}
                    </ol>
                  </details>
                )}
              </td>
              <td className={`${tdClass} max-w-[220px] text-xs text-rei-900/60`}>{row.jenis_soal === "pilihan_ganda" ? row.jawaban_benar : row.jenis_soal === "upload" ? "Peserta mengunggah berkas" : row.keywords.length ? row.keywords.map((keyword) => `${keyword.kata_kunci} (${keyword.bobot})`).join(", ") : row.kata_kunci}</td>
              <td className={tdClass}>{row.bobot}</td>
              <td className={`${tdClass} whitespace-nowrap`}>{row.waktu_soal > 0 ? `${row.waktu_soal} dtk` : "∞"}</td>
              <td className={tdClass}>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditing(row)} className={btnGhost}>Edit</button>
                  <form action={deleteSoalAction} onSubmit={(event) => { if (!window.confirm("Hapus soal ini?")) event.preventDefault(); }}>
                    <input name="id" type="hidden" value={row.id} />
                    <button className={btnDanger} type="submit">Hapus</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {!questions.length && <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-rei-900/50">Tidak ada soal ditemukan.</td></tr>}
        </tbody>
      </TableWrap>

      {editing && <EditModal question={editing} days={days} onClose={() => setEditing(null)} />}
    </>
  );
}
