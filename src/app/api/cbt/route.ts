import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { cookieSecure, getAdminSession } from "@/lib/session";
import { SignJWT, jwtVerify } from "jose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY5_FIELDS = ["smiling_voice", "intonasi", "artikulasi", "senyum_eye_contact", "body_language", "penyambutan_customer", "menanyakan_kepemilikan", "identitas_usia", "rekening_pribadi", "pengecekan_barang", "pembuatan_invoice", "surat_pernyataan", "penandatanganan_dokumen", "payment", "closing"];

function jsonError(message: string) {
  return NextResponse.json({ status: "error", message });
}
function sessionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET harus diisi minimal 32 karakter.");
  return new TextEncoder().encode(secret);
}
function imageUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.includes("uploads/")) return `/${raw.replace(/^\/+/, "")}`;
  return `/uploads/${encodeURIComponent(raw)}`;
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "";

  if (request.method === "GET" && action === "get_peserta") {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ status: "error", message: "Akses ditolak." }, { status: 401 });
    const [rows] = await db.execute("SELECT id,nama_peserta AS nama,nip,jabatan,batch,cabang,email FROM peserta ORDER BY nama_peserta ASC");
    return NextResponse.json({ status: "success", data: rows });
  }

  if (request.method === "POST" && action === "identify_peserta") {
    const form = await request.formData();
    const term = String(form.get("term") ?? "").trim();
    if (!term) return jsonError("Masukkan nama lengkap atau NIP kamu.");
    const select = "SELECT id,nama_peserta,nip,jabatan,batch,cabang,email FROM peserta";
    let [rows] = await db.execute(`${select} WHERE nip=? LIMIT 2`, [term]);
    if (!(rows as unknown[]).length) {
      [rows] = await db.execute(`${select} WHERE LOWER(TRIM(nama_peserta))=LOWER(?) LIMIT 2`, [term]);
    }
    const matches = rows as Array<{ id: number; nama_peserta: string; nip: string; jabatan: string | null; batch: string | null; cabang: string | null; email: string | null }>;
    if (!matches.length) return jsonError("Peserta tidak ditemukan. Periksa kembali nama lengkap atau NIP kamu.");
    if (matches.length > 1) return jsonError("Nama ini terdaftar lebih dari satu peserta. Silakan masukkan NIP kamu.");
    const found = matches[0];
    return NextResponse.json({ status: "success", data: found });
  }

  if (request.method === "POST" && action === "save_peserta_email") {
    const form = await request.formData();
    const id = Number(form.get("id_peserta"));
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    if (!Number.isInteger(id) || id <= 0) return jsonError("ID peserta tidak valid.");
    if (!email) return jsonError("Email peserta wajib diisi sebelum ujian dimulai.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Format email tidak valid. Contoh: nama@contoh.com");
    const [rows] = await db.execute("SELECT id,nama_peserta FROM peserta WHERE id=? LIMIT 1", [id]);
    const participant = (rows as Array<{ id: number; nama_peserta: string }>)[0];
    if (!participant) return jsonError("Peserta tidak ditemukan.");
    await db.execute("UPDATE peserta SET email=? WHERE id=?", [email, id]);
    return NextResponse.json({ status: "success", message: "Email peserta berhasil disimpan.", id_peserta: id, nama_peserta: participant.nama_peserta, email });
  }

  if (request.method === "POST" && (action === "check_token" || action === "verifikasi_token")) {
    const form = await request.formData();
    const day = String(form.get("day") ?? "").trim();
    const token = String(form.get("token") ?? "").trim();
    const participantId = Number(form.get("id_peserta"));
    if (!day) return jsonError("Hari ujian belum dipilih.");
    if (!token) return jsonError("Kode akses / token wajib diisi.");
    if (!Number.isInteger(participantId) || participantId <= 0) return jsonError("Peserta wajib dipilih.");
    const [rows] = await db.execute("SELECT id,day,token_code FROM tokens WHERE LOWER(TRIM(day))=LOWER(TRIM(?)) LIMIT 1", [day]);
    const row = (rows as Array<{ id: number; day: string; token_code: string }>)[0];
    if (!row) return jsonError(`Token untuk ${day} belum tersedia.`);
    if (String(row.token_code).trim().toUpperCase() !== token.toUpperCase()) return jsonError(`Kode akses / token salah untuk ${day}.`);
    const ticket = await new SignJWT({ day: row.day, participantId, tokenId: row.id, purpose: "exam" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("4h").sign(sessionKey());
    const response = NextResponse.json({ status: "success", message: "Token valid.", day: row.day });
    response.cookies.set("cbt_exam_ticket", ticket, { httpOnly: true, secure: cookieSecure(), sameSite: "strict", path: "/", maxAge: 4 * 60 * 60 });
    return response;
  }

  if (request.method === "GET" && action === "get_soal") {
    const day = (url.searchParams.get("day") ?? "").trim();
    if (!day) return jsonError("Parameter day kosong");
    const [rows] = await db.execute("SELECT id,no_soal,pertanyaan,gambar,bobot,waktu_soal,jenis_soal,pilihan_a,pilihan_b,pilihan_c,pilihan_d FROM soal WHERE LOWER(TRIM(day))=LOWER(TRIM(?)) ORDER BY no_soal ASC", [day]);
    const data = (rows as Array<{ id: number; no_soal: number; pertanyaan: string; gambar: string | null; bobot: number; waktu_soal: number; jenis_soal: string; pilihan_a: string | null; pilihan_b: string | null; pilihan_c: string | null; pilihan_d: string | null }>).map((row) => ({ ...row, jenis_soal: row.jenis_soal === "pilihan_ganda" ? "pilihan_ganda" : "esai", waktu_soal: Number(row.waktu_soal) || 0, gambar: imageUrl(row.gambar) }));
    return data.length ? NextResponse.json({ status: "success", data }) : jsonError(`Tidak ada soal untuk: '${day}'`);
  }

  if (request.method === "GET" && action === "get_day5_aspek") {
    const [rows] = await db.execute("SELECT id,kategori,nomor,aspek_penilaian FROM soal_day5_aspek ORDER BY kategori ASC,nomor ASC");
    return NextResponse.json({ status: "success", data: rows });
  }

  if (request.method === "POST" && action === "save_day5") {
    let payload: Record<string, unknown>;
    try { payload = await request.json() as Record<string, unknown>; } catch { return jsonError("Payload tidak valid."); }
    const id = Number(payload.id_peserta);
    if (!Number.isInteger(id) || id <= 0) return jsonError("ID peserta tidak valid.");
    const values: number[] = [];
    for (const field of DAY5_FIELDS) {
      const value = Number(payload[field]);
      if (!Number.isInteger(value) || value < 1 || value > 5) return jsonError(`Nilai untuk ${field} harus antara 1 sampai 5.`);
      values.push(value);
    }
    const notes = DAY5_FIELDS.map((field) => String(payload[`${field}_catatan`] ?? "").trim().slice(0, 5000));
    const total = values.reduce((sum, value) => sum + value, 0);
    const finalScore = total * 2;
    const columns = DAY5_FIELDS.flatMap((field) => [field, `${field}_catatan`]);
    const parameters = DAY5_FIELDS.flatMap((_, index) => [values[index], notes[index]]);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [participants] = await connection.execute("SELECT id FROM peserta WHERE id=? LIMIT 1", [id]);
      if (!(participants as unknown[]).length) throw new Error("Peserta tidak ditemukan.");
      const [existing] = await connection.execute("SELECT id FROM penilaian_day5 WHERE id_peserta=? LIMIT 1", [id]);
      if ((existing as unknown[]).length) {
        await connection.execute(`UPDATE penilaian_day5 SET ${columns.map((column) => `\`${column}\`=?`).join(",")},total_nilai=?,nilai_akhir=?,updated_at=NOW() WHERE id_peserta=?`, [...parameters, total, finalScore, id]);
      } else {
        await connection.execute(`INSERT INTO penilaian_day5 (id_peserta,${columns.map((column) => `\`${column}\``).join(",")},total_nilai,nilai_akhir,created_at,updated_at) VALUES (${Array(columns.length + 3).fill("?").join(",")},NOW(),NOW())`, [id, ...parameters, total, finalScore]);
      }
      await connection.commit();
      return NextResponse.json({ status: "success", message: "Penilaian Day 5 berhasil disimpan.", id_peserta: id, total_nilai: total, nilai_maksimal: 75, nilai_akhir: finalScore, nilai_maksimal_akhir: 150 });
    } catch (error) {
      await connection.rollback();
      return jsonError(error instanceof Error ? error.message : "Gagal menyimpan penilaian Day 5.");
    } finally {
      connection.release();
    }
  }

  if (request.method === "POST" && action === "submit_jawaban") {
    let payload: Record<string, unknown>;
    try { payload = await request.json() as Record<string, unknown>; } catch { return jsonError("Payload tidak valid."); }
    const nip = String(payload.nip ?? "").trim();
    const day = String(payload.day ?? "").trim();
    const answers = Array.isArray(payload.listJawaban) ? payload.listJawaban as Array<Record<string, unknown>> : [];
    if (!nip) return jsonError("NIP peserta tidak ditemukan.");
    if (!day) return jsonError("Hari ujian tidak ditemukan.");
    if (!answers.length) return jsonError("Tidak ada jawaban yang dikirim.");

    const cookieHeader = request.headers.get("cookie") ?? "";
    const ticket = cookieHeader.match(/(?:^|;\s*)cbt_exam_ticket=([^;]+)/)?.[1];
    if (!ticket) return jsonError("Sesi token ujian tidak ditemukan. Silakan verifikasi token kembali.");
    let ticketPayload;
    try { ticketPayload = (await jwtVerify(decodeURIComponent(ticket), sessionKey())).payload; }
    catch { return jsonError("Sesi token ujian kedaluwarsa. Silakan verifikasi token kembali."); }
    if (ticketPayload.purpose !== "exam" || String(ticketPayload.day).toLowerCase() !== day.toLowerCase()) return jsonError("Sesi token tidak sesuai dengan ujian ini.");

    const [participants] = await db.execute("SELECT id FROM peserta WHERE nip = ? LIMIT 1", [nip]);
    const pesertaId = Number((participants as Array<{ id: number }>)[0]?.id ?? 0);
    if (!pesertaId) return jsonError("Peserta tidak ditemukan.");
    if (Number(ticketPayload.participantId) !== pesertaId) return jsonError("Peserta tidak sesuai dengan sesi ujian.");

    const [questionRows] = await db.execute("SELECT id,no_soal,bobot,jenis_soal,jawaban_benar FROM soal WHERE LOWER(TRIM(day))=LOWER(TRIM(?))", [day]);
    const questions = new Map<number, { id: number; bobot: number; multipleChoice: boolean; answerKey: string }>();
    for (const row of questionRows as Array<{ id: number; no_soal: number; bobot: number; jenis_soal: string; jawaban_benar: string | null }>) questions.set(Number(row.no_soal), { id: Number(row.id), bobot: Number(row.bobot) || 0, multipleChoice: row.jenis_soal === "pilihan_ganda", answerKey: String(row.jawaban_benar ?? "").trim().toUpperCase() });

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute("DELETE jp FROM jawaban_peserta jp INNER JOIN soal s ON jp.id_soal=s.id WHERE jp.id_peserta=? AND LOWER(TRIM(s.day))=LOWER(TRIM(?))", [pesertaId, day]);
      for (const answer of answers) {
        const noSoal = Number(answer.noSoal) || 0;
        const question = questions.get(noSoal);
        if (!question) continue;
        const answerText = String(answer.jawabanPeserta ?? "").trim();
        let filePath: string | null = null;
        let savedAnswer = answerText;
        const dataUrl = answerText.match(/^data:[^;,]+;base64,([A-Za-z0-9+/=\r\n]+)$/);
        if (dataUrl) {
          const bytes = Buffer.from(dataUrl[1], "base64");
          if (bytes.length) {
            const ext = String(answer.fileName ?? "").match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase() ?? "bin";
            const safeExt = /^[a-z0-9]{1,8}$/.test(ext) ? ext : "bin";
            const fileName = `jawaban_${pesertaId}_${question.id}_${Date.now()}.${safeExt}`;
            const uploadDir = join(process.cwd(), "uploads");
            await mkdir(uploadDir, { recursive: true });
            await writeFile(join(uploadDir, fileName), bytes);
            filePath = `uploads/${fileName}`;
            savedAnswer = `[File berhasil diunggah: ${String(answer.fileName ?? fileName)}]`;
          }
        }
        const selected = answerText.toUpperCase();
        const score = question.multipleChoice ? (selected === question.answerKey ? question.bobot : 0) : 0;
        await connection.execute("INSERT INTO jawaban_peserta (id_peserta,id_soal,jawaban,file_path,skor_auto,nilai,created_at) VALUES (?,?,?,?,?,?,NOW())", [pesertaId, question.id, savedAnswer || null, filePath, score, score]);
      }
      await connection.commit();
      const response = NextResponse.json({ status: "success", message: "Berhasil." });
      response.cookies.delete("cbt_exam_ticket");
      return response;
    } catch (error) {
      await connection.rollback();
      return jsonError(`Gagal: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      connection.release();
    }
  }

  return jsonError("Aksi tidak dikenal.");
}

export async function GET(request: Request) {
  try { return await handle(request); } catch (error) { console.error("CBT API GET failed", error); return NextResponse.json({ status: "error", message: "Terjadi kesalahan server." }, { status: 500 }); }
}
export async function POST(request: Request) {
  try { return await handle(request); } catch (error) { console.error("CBT API POST failed", error); return NextResponse.json({ status: "error", message: "Terjadi kesalahan server." }, { status: 500 }); }
}
