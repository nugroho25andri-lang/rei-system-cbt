import { db } from "@/lib/db";
import { TRAINING_DAYS } from "@/lib/exam-days";
import { requireRole } from "@/lib/session";
import BulkQuestionForm from "./bulk-question-form";
import QuestionForm from "./question-form";
import QuestionManager, { type Question } from "./question-manager";
import { btnPrimary, Card, inputClass, Notice, PageHeader, Stat } from "@/components/ui";

const messages: Record<string, string> = {
  added: "Soal berhasil ditambahkan.",
  updated: "Perubahan soal berhasil disimpan.",
  invalid: "Pertanyaan, nomor soal, bobot wajib benar, dan waktu soal harus 0–86400 detik.",
  "invalid-day": "Soal pretest/posttest hanya tersedia untuk Day 1 sampai Day 4. Day 5 menggunakan penilaian praktik.",
  "pg-lengkap": "Soal pilihan ganda wajib memiliki pilihan A sampai D.",
  "pg-kunci": "Kunci jawaban pilihan ganda wajib dipilih (A, B, C, atau D).",
  "keyword-bobot": "Total bobot kata kunci tidak boleh melebihi bobot soal.",
  "gambar-tipe": "Format gambar tidak didukung. Gunakan PNG, JPG, WebP, atau GIF.",
  "gambar-ukuran": "Ukuran gambar terlalu besar. Maksimal 5 MB.",
  "gambar-gagal": "Gambar gagal disimpan. Silakan coba lagi.",
};
const successMessages = new Set(["added", "updated", "banyak"]);

export default async function KelolaSoalPage({ searchParams }: { searchParams: Promise<{ q?: string; jenis_tes?: string; msg?: string; count?: string }> }) {
  await requireRole(["superadmin", "admin", "hr_staff"]);
  const { q = "", jenis_tes: requestedTestType = "", msg, count } = await searchParams;
  const jenisTes = requestedTestType === "pretest" || requestedTestType === "posttest" ? requestedTestType : "";
  const [columnRows, statsRows, kkmRows, nextRows] = await Promise.all([
    db.execute("SELECT column_name AS name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='soal' AND column_name IN ('pertanyaan','pertanyaaan')"),
    db.execute("SELECT COUNT(*) AS total, SUM(jenis_soal='pilihan_ganda') AS pg, SUM(jenis_soal='upload') AS upload, SUM(gambar IS NOT NULL AND gambar<>'') AS images FROM soal"),
    db.execute("SELECT nilai_kkm FROM kkm LIMIT 1"),
    db.execute("SELECT day, MAX(no_soal) AS max_no FROM soal WHERE day IS NOT NULL GROUP BY day"),
  ]);
  const columns = (columnRows[0] as Array<{ name: string }>).map((row) => row.name);
  const column = columns.includes("pertanyaan") ? "pertanyaan" : "pertanyaaan";
  const [questionRows] = await db.execute(`SELECT id,day,jenis_tes,no_soal,\`${column}\` AS pertanyaan,kata_kunci,bobot,waktu_soal,jenis_soal,pilihan_a,pilihan_b,pilihan_c,pilihan_d,jawaban_benar,gambar FROM soal WHERE (\`${column}\` LIKE ? OR kata_kunci LIKE ? OR day LIKE ?) AND (?='' OR jenis_tes=?) ORDER BY id DESC`, [`%${q}%`, `%${q}%`, `%${q}%`, jenisTes, jenisTes]);
  const [keywordRows] = await db.execute("SELECT id_soal,kata_kunci,bobot FROM soal_kata_kunci ORDER BY id_soal,id");
  const keywordMap = new Map<number, Array<{ kata_kunci: string; bobot: number }>>();
  for (const row of keywordRows as Array<{ id_soal: number; kata_kunci: string; bobot: number | string }>) {
    const list = keywordMap.get(Number(row.id_soal)) ?? [];
    list.push({ kata_kunci: row.kata_kunci, bobot: Number(row.bobot) });
    keywordMap.set(Number(row.id_soal), list);
  }
  const questionList = (questionRows as unknown as Question[]).map((row) => ({ ...row, keywords: keywordMap.get(row.id) ?? [] }));
  const stats = (statsRows[0] as Array<{ total: number; pg: number | null; upload: number | null; images: number | null }>)[0];
  const total = Number(stats?.total ?? 0);
  const multipleChoice = Number(stats?.pg ?? 0);
  const uploadQuestions = Number(stats?.upload ?? 0);
  const imageQuestions = Number(stats?.images ?? 0);
  const kkm = Number((kkmRows[0] as Array<{ nilai_kkm: number }>)[0]?.nilai_kkm ?? 675);
  const days = [...TRAINING_DAYS];
  const nextNumbers: Record<string, number> = {};
  for (const row of nextRows[0] as Array<{ day: string; max_no: number | string }>) {
    nextNumbers[row.day] = Number(row.max_no) + 1;
  }
  const notice = msg === "banyak"
    ? `${Number(count ?? 1)} soal berhasil disimpan.`
    : msg ? messages[msg] : undefined;

  return (
    <>
      <PageHeader title="Kelola Soal Ujian" description="Bank soal CBT — tambah, edit, impor massal, dan hapus soal." />
      {notice && <Notice kind={msg && successMessages.has(msg) ? "success" : "error"}>{notice}</Notice>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Total Soal" value={total} />
        <Stat label="Pilihan Ganda" value={multipleChoice} />
        <Stat label="Upload File" value={uploadQuestions} />
        <Stat label="Soal Bergambar" value={imageQuestions} />
        <Stat label="Standar KKM" value={kkm} />
      </div>

      <Card title="Tambah Soal" className="mb-6"><QuestionForm days={days} /></Card>

      <Card title="Tambah Banyak Soal" description="Isi beberapa soal sekaligus, lalu simpan dalam satu transaksi." className="mb-6">
        <BulkQuestionForm days={days} nextNumbers={nextNumbers} />
      </Card>

      <Card
        title={`Daftar Soal (${questionList.length})`}
        actions={<form action="/kelola-soal" className="flex flex-wrap items-center gap-2"><select className="min-w-32 rounded-lg border border-rei-900/15 bg-white px-3 py-2 text-sm" name="jenis_tes" defaultValue={jenisTes}><option value="">Semua tes</option><option value="pretest">Pretest</option><option value="posttest">Posttest</option></select><input className={`${inputClass} max-w-64`} name="q" defaultValue={q} placeholder="Cari soal, kata kunci, atau day" /><button type="submit" className={btnPrimary}>Cari</button></form>}
        bodyClassName="px-5 pb-4 pt-2"
      >
        <QuestionManager questions={questionList} days={days} />
      </Card>
    </>
  );
}
