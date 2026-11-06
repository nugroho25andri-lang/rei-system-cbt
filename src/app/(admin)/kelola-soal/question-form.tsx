"use client";
import { useState } from "react";
import { addSoalAction } from "./actions";
import { btnPrimary, inputClass, selectClass } from "@/components/ui";

export default function QuestionForm({ days }: { days: string[] }) {
  const [jenis, setJenis] = useState<"esai" | "pilihan_ganda">("esai");
  const label = "grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-rei-900/60";
  return (
    <form action={addSoalAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <label className={label}>Day<select name="day" defaultValue={days[0]} className={selectClass}>{days.map((day) => <option key={day}>{day}</option>)}</select></label>
      <label className={label}>Nomor soal<input className={inputClass} name="no_soal" type="number" min="1" defaultValue="1" required /></label>
      <label className={label}>Jenis soal<select name="jenis_soal" className={selectClass} value={jenis} onChange={(event) => setJenis(event.target.value as "esai" | "pilihan_ganda")}><option value="esai">Esai</option><option value="pilihan_ganda">Pilihan ganda</option></select></label>
      <label className={label}>Bobot<input className={inputClass} name="bobot" type="number" min="1" defaultValue="1" required /></label>
      <label className={label}>Waktu soal (detik)<input className={inputClass} name="waktu_soal" type="number" min="0" max="86400" defaultValue="0" title="0 = tanpa batas waktu" required /></label>
      <label className={`${label} sm:col-span-2 lg:col-span-5`}>Pertanyaan<textarea className={inputClass} name="pertanyaan" rows={3} required /></label>
      <p className="text-[11px] text-rei-900/45 sm:col-span-2 lg:col-span-5">Isi waktu dalam detik untuk membatasi tiap soal (contoh: 90). Isi 0 bila soal tanpa batas waktu.</p>
      {jenis === "pilihan_ganda" ? (
        <>
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-4">
            {(["A", "B", "C", "D"] as const).map((letter) => (
              <label key={letter} className={label}>Pilihan {letter}<input className={inputClass} name={`pilihan_${letter.toLowerCase()}`} placeholder={`Isi pilihan ${letter}`} required /></label>
            ))}
          </div>
          <label className={`${label} sm:col-span-1`}>Kunci jawaban<select name="jawaban_benar" className={selectClass} defaultValue="A">{(['A', 'B', 'C', 'D'] as const).map((letter) => <option key={letter} value={letter}>{letter}</option>)}</select></label>
          <div className="flex items-end sm:col-span-1 lg:col-span-4"><button type="submit" className={btnPrimary}>Tambah Soal</button></div>
        </>
      ) : (
        <>
          <label className={`${label} sm:col-span-2 lg:col-span-4`}>Kata kunci<input className={inputClass} name="kata_kunci" placeholder="Pisahkan dengan koma" /></label>
          <div className="flex items-end sm:col-span-2 lg:col-span-1"><button type="submit" className={`${btnPrimary} w-full`}>Tambah Soal</button></div>
        </>
      )}
    </form>
  );
}
