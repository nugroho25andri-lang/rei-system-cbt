"use client";
import { useState } from "react";
import { addSoalAction } from "./actions";
import KeywordEditor, { type KeywordDraft } from "@/components/keyword-editor";
import TableBuilder from "@/components/table-builder";
import { btnPrimary, inputClass, selectClass } from "@/components/ui";
import { isQuestionDay } from "@/lib/exam-days";

const label = "grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-rei-900/60";
const toggleBase = "rounded-lg border px-3 py-1.5 text-xs font-bold transition";

export default function QuestionForm({ days }: { days: string[] }) {
  const [jenis, setJenis] = useState<"esai" | "tabel" | "pilihan_ganda" | "upload">("esai");
  const [hasImage, setHasImage] = useState(false);
  const [imageName, setImageName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [bobotValue, setBobotValue] = useState("1");
  const [keywords, setKeywords] = useState<KeywordDraft[]>([{ kata_kunci: "", bobot: "1" }]);
  const [day, setDay] = useState(days[0] ?? "Day 1");
  const canAddQuestion = isQuestionDay(day);

  function pickImage(file: File | undefined) {
    if (preview) URL.revokeObjectURL(preview);
    if (!file) {
      setPreview(null);
      setImageName("");
      return;
    }
    setImageName(file.name);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={addSoalAction} encType="multipart/form-data" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <label className={label}>Day<select name="day" value={day} onChange={(event) => setDay(event.target.value)} className={selectClass}>{days.map((item) => <option key={item}>{item}</option>)}</select></label>
      {canAddQuestion
        ? <label className={label}>Jenis tes<select name="jenis_tes" defaultValue="posttest" className={selectClass}><option value="pretest">Pretest</option><option value="posttest">Posttest</option></select></label>
        : <><input type="hidden" name="jenis_tes" value="posttest" /><p className="self-end rounded-lg border border-gold-500/30 bg-gold-200/40 px-3 py-2 text-[11px] leading-relaxed text-rei-900/65">Day 5 menggunakan penilaian praktik, bukan soal pretest/posttest.</p></>}
      <label className={label}>Nomor soal<input className={inputClass} name="no_soal" type="number" min="1" defaultValue="1" required /></label>
      <label className={label}>Jenis soal
        <select name="jenis_soal" className={selectClass} value={jenis} onChange={(event) => setJenis(event.target.value as typeof jenis)}>
          <option value="esai">Esai (Teks)</option>
          <option value="tabel">Tabel / Kolom (Excel)</option>
          <option value="pilihan_ganda">Pilihan ganda</option>
          <option value="upload">Upload file (Excel/PDF/PNG)</option>
        </select>
      </label>
      <label className={label}>Bobot<input className={inputClass} name="bobot" type="number" min="1" value={bobotValue} onChange={(event) => setBobotValue(event.target.value)} required /></label>
      <label className={label}>Waktu soal (detik)<input className={inputClass} name="waktu_soal" type="number" min="0" max="86400" defaultValue="0" title="0 = tanpa batas waktu" required /></label>
      <label className={`${label} sm:col-span-2 lg:col-span-5`}>Pertanyaan<textarea className={inputClass} name="pertanyaan" rows={3} required /></label>
      <p className="text-[11px] text-rei-900/45 sm:col-span-2 lg:col-span-5">Isi waktu dalam detik untuk membatasi tiap soal (contoh: 90). Isi 0 bila soal tanpa batas waktu.</p>

      {(jenis === "esai" || jenis === "tabel") && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rei-900/10 bg-[#faf8fa] px-3.5 py-2.5 sm:col-span-2 lg:col-span-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rei-900/65">Format Jawaban Peserta</p>
            <p className="text-[11px] text-rei-900/45">Pilih apakah peserta menjawab dengan esai teks biasa atau mengisi tabel kolom seperti Excel.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-pressed={jenis === "esai"} onClick={() => setJenis("esai")} className={`${toggleBase} ${jenis === "esai" ? "border-rei-900 bg-rei-900 text-gold-300" : "border-rei-900/15 bg-white text-rei-900/60 hover:border-gold-400"}`}>Esai (Tanpa Tabel)</button>
            <button type="button" aria-pressed={jenis === "tabel"} onClick={() => setJenis("tabel")} className={`${toggleBase} ${jenis === "tabel" ? "border-rei-900 bg-rei-900 text-gold-300" : "border-rei-900/15 bg-white text-rei-900/60 hover:border-gold-400"}`}>Buat Tabel (Seperti Excel)</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-rei-900/10 bg-[#faf8fa] p-3.5 sm:col-span-2 lg:col-span-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rei-900/60">Gambar soal</p>
            <p className="mt-0.5 text-[11px] text-rei-900/45">Lampirkan gambar pendukung bila soal membutuhkan visual.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-pressed={!hasImage} onClick={() => { setHasImage(false); setImageName(""); }} className={`${toggleBase} ${!hasImage ? "border-rei-900 bg-rei-900 text-gold-300" : "border-rei-900/15 bg-white text-rei-900/60 hover:border-gold-400"}`}>Tanpa gambar</button>
            <button type="button" aria-pressed={hasImage} onClick={() => setHasImage(true)} className={`${toggleBase} ${hasImage ? "border-rei-900 bg-rei-900 text-gold-300" : "border-rei-900/15 bg-white text-rei-900/60 hover:border-gold-400"}`}>Dengan gambar</button>
          </div>
        </div>
        {hasImage && (
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px]">
            <div>
              <input type="file" name="gambar" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => pickImage(event.target.files?.[0])} className="block w-full cursor-pointer rounded-lg border border-rei-900/15 bg-white px-3 py-2 text-xs text-rei-900 file:mr-3 file:rounded-md file:border-0 file:bg-rei-900 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-gold-300" />
              <p className="mt-1.5 text-[11px] text-rei-900/45">PNG, JPG, WebP, atau GIF. Maksimal 5 MB.{imageName ? ` Dipilih: ${imageName}` : ""}</p>
            </div>
            <div className="grid h-24 place-items-center overflow-hidden rounded-lg border border-dashed border-rei-900/20 bg-white">
              {preview ? <img src={preview} alt="Pratinjau gambar soal" className="h-full w-full object-contain" /> : <span className="text-[11px] text-rei-900/35">Pratinjau gambar</span>}
            </div>
          </div>
        )}
      </div>

      {jenis === "pilihan_ganda" && (
        <>
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-4">
            {(["A", "B", "C", "D"] as const).map((letter) => (
              <label key={letter} className={label}>Pilihan {letter}<input className={inputClass} name={`pilihan_${letter.toLowerCase()}`} placeholder={`Isi pilihan ${letter}`} required /></label>
            ))}
          </div>
          <label className={`${label} sm:col-span-1`}>Kunci jawaban<select name="jawaban_benar" className={selectClass} defaultValue="A">{(['A', 'B', 'C', 'D'] as const).map((letter) => <option key={letter} value={letter}>{letter}</option>)}</select></label>
        </>
      )}

      {jenis === "esai" && (
        <div className="sm:col-span-2 lg:col-span-5">
          <KeywordEditor rows={keywords} onChange={setKeywords} bobot={Number(bobotValue) || 0} />
        </div>
      )}

      {jenis === "tabel" && (
        <div className="sm:col-span-2 lg:col-span-5">
          <TableBuilder />
        </div>
      )}

      {jenis === "upload" && (
        <p className="rounded-lg border border-gold-500/30 bg-gold-200/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-rei-900/65 sm:col-span-2 lg:col-span-5">
          Peserta akan mengunggah berkas jawaban (Excel .xlsx/.xls, PDF, atau PNG) maksimal 8 MB. Kata kunci tidak diperlukan untuk tipe soal ini.
        </p>
      )}

      <div className="flex items-center justify-end border-t border-rei-900/10 pt-4 sm:col-span-2 lg:col-span-5">
        <button type="submit" className={btnPrimary} disabled={!canAddQuestion}>Tambah Soal</button>
      </div>
    </form>
  );
}
