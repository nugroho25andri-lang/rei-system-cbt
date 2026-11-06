import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";
function indexedEntries(form: FormData, name: string) {
  const result: Array<[number, FormDataEntryValue]> = [];
  for (const [key, value] of form.entries()) {
    const match = key.match(new RegExp(`^${name}\\[(\\d+)\\]$`));
    if (match) result.push([Number(match[1]), value]);
  }
  return result;
}
export async function POST(request: Request) {
  if (!await getAdminSession()) return NextResponse.json({ success: false, message: "Sesi login habis, silakan login ulang." }, { status: 401 });
  if (request.headers.get("content-type")?.includes("application/json")) {
    const payload = await request.json() as Record<string, unknown>;
    if (payload.action === "save_koreksi") {
      const items = Array.isArray(payload.items) ? payload.items as Array<Record<string, unknown>> : [];
      if (!items.length) return NextResponse.json({ success: false, message: "Tidak ada data nilai yang dikirim." });
      const nip = String(payload.nip ?? "").trim();
      const day = String(payload.day ?? "").trim().toLowerCase().replace(/\s+/g, " ");
      const [participants] = await db.execute("SELECT id FROM peserta WHERE nip = ? LIMIT 1", [nip]);
      const pesertaId = Number((participants as Array<{ id: number }>)[0]?.id ?? 0);
      const connection = await db.getConnection();
      const failures: number[] = [];
      const saved: Array<{ id: number; id_soal: number; nilai: number }> = [];
      try {
        await connection.beginTransaction();
        for (const item of items) {
          const answerId = Number(item.id) || 0;
          const questionId = Number(item.id_soal) || 0;
          const rawScore = item.nilai;
          const score = Number(rawScore);
          const note = String(item.catatan ?? "").trim();
          if (rawScore === "" || rawScore === null || !Number.isFinite(score)) { failures.push(answerId || questionId); continue; }
          let targetId = answerId;
          if (!targetId && (day === "day 3" || day === "day 4") && pesertaId > 0 && questionId > 0) {
            const [existing] = await connection.execute("SELECT id FROM jawaban_peserta WHERE id_peserta = ? AND id_soal = ? LIMIT 1", [pesertaId, questionId]);
            targetId = Number((existing as Array<{ id: number }>)[0]?.id ?? 0);
            if (!targetId) {
              const [insert] = await connection.execute("INSERT INTO jawaban_peserta (id_peserta,id_soal,jawaban,skor_auto,nilai,catatan_koreksi,is_dikoreksi,created_at) VALUES (?,?,'',0,?,?,1,NOW())", [pesertaId, questionId, score, note]);
              targetId = Number((insert as { insertId: number }).insertId);
            }
          }
          if (targetId) {
            await connection.execute("UPDATE jawaban_peserta SET nilai = ?, catatan_koreksi = ?, is_dikoreksi = 1 WHERE id = ?", [score, note, targetId]);
            saved.push({ id: targetId, id_soal: questionId, nilai: score });
          } else failures.push(questionId);
        }
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Gagal menyimpan nilai." }, { status: 500 });
      } finally { connection.release(); }
      return NextResponse.json({ success: failures.length === 0, message: failures.length === 0 ? `Nilai berhasil disimpan (${saved.length} soal) dan dapat diedit kembali.` : "Sebagian nilai gagal disimpan.", berhasil: saved.length, gagal: failures, saved_items: saved });
    }
    if (payload.action === "save_day5") {
      const fields = ["smiling_voice", "intonasi", "artikulasi", "senyum_eye_contact", "body_language", "penyambutan_customer", "menanyakan_kepemilikan", "identitas_usia", "rekening_pribadi", "pengecekan_barang", "pembuatan_invoice", "surat_pernyataan", "penandatanganan_dokumen", "payment", "closing"];
      const values: number[] = [];
      const notes: string[] = [];
      for (const field of fields) {
        const value = payload[field];
        if (value === "" || value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) < 1 || Number(value) > 5) return NextResponse.json({ success: false, message: `Nilai "${field}" harus antara 1 sampai 5.` });
        values.push(Math.trunc(Number(value)));
        notes.push(String(payload[`${field}_catatan`] ?? "").trim());
      }
      const nip = String(payload.nip ?? "").trim();
      if (!nip) return NextResponse.json({ success: false, message: "NIP peserta tidak ditemukan." });
      const [participants] = await db.execute("SELECT id FROM peserta WHERE nip = ? LIMIT 1", [nip]);
      const pesertaId = Number((participants as Array<{ id: number }>)[0]?.id ?? 0);
      if (!pesertaId) return NextResponse.json({ success: false, message: `Peserta dengan NIP "${nip}" tidak ditemukan.` });
      const total = values.reduce((sum, value) => sum + value, 0);
      const columns = fields.flatMap((field) => [field, `${field}_catatan`]);
      const valueParams = values.flatMap((value, index) => [value, notes[index]]);
      const [existing] = await db.execute("SELECT id FROM penilaian_day5 WHERE id_peserta = ? LIMIT 1", [pesertaId]);
      if ((existing as unknown[]).length) {
        const set = columns.map((column) => `\`${column}\` = ?`).join(", ");
        await db.execute(`UPDATE penilaian_day5 SET ${set},total_nilai=?,nilai_akhir=?,updated_at=NOW() WHERE id_peserta=?`, [...valueParams, total, total * 2, pesertaId]);
      } else {
        await db.execute(`INSERT INTO penilaian_day5 (id_peserta,${columns.map((column) => `\`${column}\``).join(",")},total_nilai,nilai_akhir,created_at,updated_at) VALUES (${Array(columns.length + 3).fill("?").join(",")},NOW(),NOW())`, [pesertaId, ...valueParams, total, total * 2]);
      }
      return NextResponse.json({ success: true, message: "Nilai Day 5 berhasil disimpan dan dapat diedit kembali.", id_peserta: pesertaId, total_nilai: total, nilai_akhir: total * 2 });
    }
    return NextResponse.json({ success: false, message: "Aksi koreksi tidak dikenal." }, { status: 400 });
  }
  const form = await request.formData();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const [id, value] of indexedEntries(form, "nilai")) {
      await connection.execute("UPDATE jawaban_peserta SET nilai = ?, is_koreksi = 1 WHERE id = ?", [Number(value) || 0, id]);
    }
    for (const [id, value] of indexedEntries(form, "pb")) {
      let json: string;
      try { json = JSON.stringify(JSON.parse(String(value))); } catch { json = JSON.stringify(value); }
      await connection.execute("UPDATE jawaban_peserta SET data_pembukuan = ? WHERE id = ?", [json, id]);
    }
    for (const [id, value] of indexedEntries(form, "jawaban")) {
      await connection.execute("UPDATE jawaban_peserta SET jawaban = ? WHERE id = ?", [String(value), id]);
    }
    await connection.commit();
    return NextResponse.json({ status: "success", message: "Data berhasil disimpan" });
  } catch (error) {
    await connection.rollback();
    return NextResponse.json({ status: "error", message: error instanceof Error ? error.message : "Gagal menyimpan data" }, { status: 500 });
  } finally { connection.release(); }
}
