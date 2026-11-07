import { db } from "@/lib/db";
import { randomInt } from "node:crypto";
import {
  TRAINER_CRITERIA,
  batchSortValue,
  durationMinutes,
  formatJam,
  isoDate,
  normalizeBatch,
  todayJakarta,
  type TrainerCriterionKey,
} from "@/lib/trainer-evaluation-shared";

export type TrainerSlot = { trainer: string; jamMulai: string; jamSelesai: string; materi: string };
export type TrainerDay = { dayKe: number; tanggal: string; slots: TrainerSlot[] };
export type TrainerContext = {
  batch: string;
  batchLabel: string;
  evaluasiBatchId: number | null;
  source: "rundown" | "fallback";
  days: TrainerDay[];
  trainers: string[];
  schedule: Record<string, Array<{ dayKe: number; tanggal: string; jamMulai: string; jamSelesai: string; materi: string }>>;
};

export type EvaluationRow = {
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
};

const FALLBACK_DAYS = 6;

let tableReady = false;
export async function ensureTrainerEvaluationTable() {
  if (tableReady) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS penilaian_trainer (
    id BIGINT NOT NULL AUTO_INCREMENT,
    id_peserta INT NOT NULL,
    nip VARCHAR(100) NOT NULL,
    nama_peserta VARCHAR(150) NOT NULL,
    batch VARCHAR(255) NOT NULL,
    trainer VARCHAR(100) NOT NULL,
    day_ke TINYINT NOT NULL,
    tanggal DATE NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    durasi_menit INT NOT NULL,
    nilai_1 TINYINT NOT NULL,
    nilai_2 TINYINT NOT NULL,
    nilai_3 TINYINT NOT NULL,
    nilai_4 TINYINT NOT NULL,
    nilai_5 TINYINT NOT NULL,
    nilai_6 TINYINT NOT NULL,
    nilai_7 TINYINT NOT NULL,
    nilai_8 TINYINT NOT NULL,
    nilai_9 TINYINT NOT NULL,
    nilai_10 TINYINT NOT NULL,
    rata_rata DECIMAL(4,2) NOT NULL,
    hal_terbaik TEXT NULL,
    perbaikan TEXT NULL,
    sumber ENUM('portal','kode') NOT NULL DEFAULT 'portal',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_penilaian_trainer (id_peserta, trainer, tanggal),
    KEY idx_penilaian_batch (batch),
    KEY idx_penilaian_trainer (trainer),
    KEY idx_penilaian_tanggal (tanggal),
    CONSTRAINT fk_penilaian_trainer_peserta FOREIGN KEY (id_peserta) REFERENCES peserta (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  tableReady = true;
}

function splitTrainers(value: unknown) {
  return String(value ?? "")
    .split(/[,;/&]+|\bdan\b/gi)
    .map((entry) => entry.replace(/\(.*?\)/g, "").trim())
    .filter(Boolean);
}

async function findEvaluasiBatch(batch: string) {
  const [rows] = await db.execute("SELECT id, nama_batch FROM evaluasi_batch ORDER BY id DESC");
  const target = normalizeBatch(batch);
  if (!target) return null;
  const found = (rows as Array<{ id: number; nama_batch: string }>).find((row) => normalizeBatch(row.nama_batch) === target);
  return found ? { id: Number(found.id), label: String(found.nama_batch) } : null;
}

async function loadFallbackTrainers() {
  try {
    const [rows] = await db.execute("SELECT nama_trainer FROM admins WHERE is_active=1 AND TRIM(COALESCE(nama_trainer,''))<>'' ORDER BY nama_trainer");
    return Array.from(new Set((rows as Array<{ nama_trainer: string }>).map((row) => String(row.nama_trainer).trim()).filter(Boolean)));
  } catch {
    return [] as string[];
  }
}

export async function getBatchContext(batch: string): Promise<TrainerContext> {
  const batchValue = String(batch ?? "").trim();
  const evaluasiBatch = await findEvaluasiBatch(batchValue);
  const days: TrainerDay[] = [];
  let trainers: string[] = [];

  if (evaluasiBatch) {
    const [rows] = await db.execute(
      "SELECT day_ke, tanggal, jam_mulai, jam_selesai, materi, trainer FROM evaluasi_rundown WHERE batch_id=? AND TRIM(COALESCE(trainer,''))<>'' ORDER BY day_ke, jam_mulai",
      [evaluasiBatch.id],
    );
    const dayMap = new Map<number, TrainerDay>();
    const seen = new Map<string, string>();
    for (const row of rows as Array<{ day_ke: number; tanggal: string | Date; jam_mulai: string; jam_selesai: string; materi: string; trainer: string }>) {
      const dayKe = Number(row.day_ke);
      if (!Number.isInteger(dayKe) || dayKe <= 0) continue;
      const day = dayMap.get(dayKe) ?? { dayKe, tanggal: isoDate(row.tanggal), slots: [] };
      day.slots.push({ trainer: String(row.trainer).trim(), jamMulai: formatJam(String(row.jam_mulai)), jamSelesai: formatJam(String(row.jam_selesai)), materi: String(row.materi ?? "") });
      dayMap.set(dayKe, day);
      for (const name of splitTrainers(row.trainer)) {
        const key = name.toLowerCase();
        if (!seen.has(key)) seen.set(key, name);
      }
    }
    trainers = Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "id"));
    days.push(...Array.from(dayMap.values()).sort((a, b) => a.dayKe - b.dayKe));
  }

  if (!trainers.length) {
    trainers = await loadFallbackTrainers();
    for (let dayKe = 1; dayKe <= FALLBACK_DAYS; dayKe += 1) days.push({ dayKe, tanggal: "", slots: [] });
  }

  const schedule: TrainerContext["schedule"] = {};
  for (const day of days) {
    for (const slot of day.slots) {
      for (const name of splitTrainers(slot.trainer)) {
        const canonical = trainers.find((entry) => entry.toLowerCase() === name.toLowerCase()) ?? name;
        (schedule[canonical] ??= []).push({ dayKe: day.dayKe, tanggal: day.tanggal, jamMulai: slot.jamMulai, jamSelesai: slot.jamSelesai, materi: slot.materi });
      }
    }
  }

  return {
    batch: batchValue,
    batchLabel: evaluasiBatch?.label ?? (batchValue ? `Batch ${batchValue}` : "Batch"),
    evaluasiBatchId: evaluasiBatch?.id ?? null,
    source: evaluasiBatch && days.some((day) => day.slots.length) ? "rundown" : "fallback",
    days,
    trainers,
    schedule,
  };
}

export async function getAccessCodeBatch(code: string) {
  const value = String(code ?? "").trim();
  if (!value) return null;
  const [rows] = await db.execute(
    "SELECT b.id, b.nama_batch FROM evaluasi_kode_akses k INNER JOIN evaluasi_batch b ON b.id=k.batch_id WHERE k.kode_akses=? AND k.aktif=1 LIMIT 1",
    [value],
  );
  const row = (rows as Array<{ id: number; nama_batch: string }>)[0];
  return row ? { id: Number(row.id), label: String(row.nama_batch) } : null;
}

export type AccessCodeBatchRow = { id: number; label: string; code: string | null; evaluations: number };

export async function getAccessCodeOverview(): Promise<AccessCodeBatchRow[]> {
  await ensureTrainerEvaluationTable();
  const [batchRows, codeRows, countRows] = await Promise.all([
    db.execute("SELECT id,nama_batch FROM evaluasi_batch ORDER BY id DESC"),
    db.execute("SELECT id,batch_id,kode_akses,aktif FROM evaluasi_kode_akses ORDER BY aktif DESC, id DESC"),
    db.execute("SELECT batch,COUNT(*) n FROM penilaian_trainer GROUP BY batch"),
  ]);
  const evaluationsByBatch: Record<string, number> = {};
  for (const row of countRows[0] as Array<{ batch: string; n: number | string }>) {
    evaluationsByBatch[normalizeBatch(row.batch)] = Number(row.n) || 0;
  }
  const codeByBatch = new Map<number, string>();
  for (const row of codeRows[0] as Array<{ batch_id: number; kode_akses: string }>) {
    const batchId = Number(row.batch_id);
    if (!codeByBatch.has(batchId)) codeByBatch.set(batchId, String(row.kode_akses));
  }
  return (batchRows[0] as Array<{ id: number; nama_batch: string }>).map((row) => ({
    id: Number(row.id),
    label: String(row.nama_batch),
    code: codeByBatch.get(Number(row.id)) ?? null,
    evaluations: evaluationsByBatch[normalizeBatch(row.nama_batch)] ?? 0,
  }));
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export async function issueAccessCode(batchId: number, regenerate: boolean) {
  if (!Number.isInteger(batchId) || batchId <= 0) throw new Error("Batch tidak valid.");
  const [rows] = await db.execute("SELECT id,nama_batch FROM evaluasi_batch WHERE id=? LIMIT 1", [batchId]);
  const batch = (rows as Array<{ id: number; nama_batch: string }>)[0];
  if (!batch) throw new Error("Batch tidak ditemukan.");
  if (!regenerate) {
    const [active] = await db.execute("SELECT kode_akses FROM evaluasi_kode_akses WHERE batch_id=? AND aktif=1 LIMIT 1", [batchId]);
    const existing = (active as Array<{ kode_akses: string }>)[0];
    if (existing) return String(existing.kode_akses);
  }
  const suffix = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  const code = `B${normalizeBatch(batch.nama_batch).toUpperCase()}-${suffix}`;
  if (regenerate) await db.execute("UPDATE evaluasi_kode_akses SET aktif=0 WHERE batch_id=?", [batchId]);
  await db.execute("INSERT INTO evaluasi_kode_akses (batch_id,kode_akses,aktif) VALUES (?,?,1)", [batchId, code]);
  return code;
}

export type InsertEvaluationInput = {
  pesertaId: number;
  nip: string;
  namaPeserta: string;
  batch: string;
  trainer: string;
  dayKe: number;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  scores: Record<TrainerCriterionKey, number>;
  halTerbaik: string;
  perbaikan: string;
  sumber: "portal" | "kode";
};

export async function insertTrainerEvaluation(input: InsertEvaluationInput) {
  await ensureTrainerEvaluationTable();
  const values = TRAINER_CRITERIA.map((criterion) => input.scores[criterion.key]);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  try {
    await db.execute(
      `INSERT INTO penilaian_trainer
        (id_peserta,nip,nama_peserta,batch,trainer,day_ke,tanggal,jam_mulai,jam_selesai,durasi_menit,
         nilai_1,nilai_2,nilai_3,nilai_4,nilai_5,nilai_6,nilai_7,nilai_8,nilai_9,nilai_10,rata_rata,hal_terbaik,perbaikan,sumber)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        input.pesertaId,
        input.nip,
        input.namaPeserta,
        input.batch,
        input.trainer,
        input.dayKe,
        input.tanggal,
        input.jamMulai,
        input.jamSelesai,
        durationMinutes(input.jamMulai, input.jamSelesai),
        ...values,
        Number(average.toFixed(2)),
        input.halTerbaik || null,
        input.perbaikan || null,
        input.sumber,
      ],
    );
    return { ok: true as const };
  } catch (error) {
    if ((error as { code?: string })?.code === "ER_DUP_ENTRY") {
      return { ok: false as const, reason: "duplicate" as const };
    }
    throw error;
  }
}

export async function getParticipantEvaluationHistory(pesertaId: number) {
  await ensureTrainerEvaluationTable();
  const [rows] = await db.execute(
    "SELECT id,trainer,day_ke,tanggal,jam_mulai,jam_selesai,durasi_menit,rata_rata FROM penilaian_trainer WHERE id_peserta=? ORDER BY tanggal DESC, id DESC LIMIT 40",
    [pesertaId],
  );
  return (rows as Array<Record<string, unknown>>).map((row) => ({
    id: Number(row.id),
    trainer: String(row.trainer),
    dayKe: Number(row.day_ke),
    tanggal: isoDate(row.tanggal as string),
    jamMulai: formatJam(String(row.jam_mulai)),
    jamSelesai: formatJam(String(row.jam_selesai)),
    durasi: Number(row.durasi_menit),
    rataRata: Number(row.rata_rata),
  }));
}

export type TrainerRank = {
  trainer: string;
  average: number;
  responses: number;
  minutes: number;
  sessions: number;
  batches: string[];
  lastDate: string;
  criteria: Record<TrainerCriterionKey, number>;
  weakest: { key: TrainerCriterionKey; label: string; value: number };
  strongest: { key: TrainerCriterionKey; label: string; value: number };
  trend: { delta: number; previousBatch: string; latestBatch: string } | null;
  tone: "good" | "watch" | "attention";
  action: string;
};

export type TrainerBatchPoint = { batch: string; average: number; responses: number };

export type TrainerAnalysis = {
  generatedAt: string;
  batches: string[];
  trainers: string[];
  filters: { batch: string; trainer: string };
  totals: { responses: number; trainers: number; average: number; minutes: number; sessions: number; participants: number };
  ranking: TrainerRank[];
  criteria: Array<{ key: TrainerCriterionKey; label: string; question: string; average: number; lowCount: number }>;
  series: Array<{ trainer: string; points: TrainerBatchPoint[]; delta: number | null }>;
  sessions: Array<EvaluationRow & { scores: Record<TrainerCriterionKey, number> }>;
  comments: { good: string[]; improve: string[] };
  recommendations: Array<{ trainer: string; tone: TrainerRank["tone"]; headline: string; steps: string[] }>;
};

function criteriaRecord(row: Record<string, unknown>) {
  const result = {} as Record<TrainerCriterionKey, number>;
  for (const criterion of TRAINER_CRITERIA) result[criterion.key] = Number(row[criterion.key] ?? 0);
  return result;
}

function uniqueMinutes(rows: Array<{ trainer: string; tanggal: string; jam_mulai: string; jam_selesai: string; durasi_menit: number }>) {
  const seen = new Set<string>();
  let total = 0;
  for (const row of rows) {
    const key = `${row.trainer}|${isoDate(row.tanggal)}|${formatJam(row.jam_mulai)}|${formatJam(row.jam_selesai)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    total += Number(row.durasi_menit) || durationMinutes(row.jam_mulai, row.jam_selesai);
  }
  return total;
}

function toneFor(average: number, weakest: number, delta: number | null): TrainerRank["tone"] {
  if (average < 4 || weakest < 3.5) return "attention";
  if (average < 4.5 || weakest < 4 || (delta !== null && delta <= -0.2)) return "watch";
  return "good";
}

function actionFor(tone: TrainerRank["tone"], rank: Pick<TrainerRank, "trainer" | "average" | "weakest" | "trend">) {
  const trendText = rank.trend ? ` Tren ${rank.trend.delta >= 0 ? "naik" : "turun"} ${Math.abs(rank.trend.delta).toFixed(2)} poin dibanding ${rank.trend.previousBatch}.` : "";
  if (tone === "attention") {
    return `Lakukan evaluasi mendalam bersama ${rank.trainer}: observasi ulang sesi, bahas aspek "${rank.weakest.label}" (${rank.weakest.value.toFixed(2)}/5), lalu susun rencana perbaikan dan jadwalkan sesi pendampingan.${trendText}`;
  }
  if (tone === "watch") {
    return `Beri umpan balik terarah kepada ${rank.trainer} pada aspek "${rank.weakest.label}" (${rank.weakest.value.toFixed(2)}/5) dan pantau sesi berikutnya.${trendText}`;
  }
  return `Pertahankan kualitas mengajar ${rank.trainer} (rata-rata ${rank.average.toFixed(2)}/5). Jadikan praktik terbaiknya sebagai contoh untuk trainer lain.${trendText}`;
}

export async function getTrainerAnalysis(filter: { batch?: string; trainer?: string } = {}): Promise<TrainerAnalysis> {
  await ensureTrainerEvaluationTable();
  const batchFilter = String(filter.batch ?? "").trim();
  const trainerFilter = String(filter.trainer ?? "").trim();

  const [allRows] = await db.execute(
    `SELECT id,id_peserta,nip,nama_peserta,batch,trainer,day_ke,tanggal,jam_mulai,jam_selesai,durasi_menit,
      nilai_1,nilai_2,nilai_3,nilai_4,nilai_5,nilai_6,nilai_7,nilai_8,nilai_9,nilai_10,rata_rata,hal_terbaik,perbaikan,sumber,created_at
     FROM penilaian_trainer ORDER BY tanggal DESC, id DESC`,
  );
  const rows = allRows as Array<Record<string, unknown>>;

  const batches = Array.from(new Set(rows.map((row) => String(row.batch ?? "").trim()).filter(Boolean)))
    .sort((a, b) => batchSortValue(b) - batchSortValue(a) || a.localeCompare(b));
  const trainers = Array.from(new Set(rows.map((row) => String(row.trainer ?? "").trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "id"));

  const filtered = rows.filter((row) => {
    if (batchFilter && String(row.batch ?? "").trim() !== batchFilter) return false;
    if (trainerFilter && String(row.trainer ?? "").trim().toLowerCase() !== trainerFilter.toLowerCase()) return false;
    return true;
  });

  const groupByTrainer = new Map<string, Array<Record<string, unknown>>>();
  for (const row of filtered) {
    const name = String(row.trainer ?? "").trim();
    if (!name) continue;
    const group = groupByTrainer.get(name);
    if (group) group.push(row);
    else groupByTrainer.set(name, [row]);
  }

  const rankingBase = Array.from(groupByTrainer.entries()).map(([trainer, group]) => {
    const average = group.reduce((sum, row) => sum + Number(row.rata_rata ?? 0), 0) / group.length;
    const criteria = {} as Record<TrainerCriterionKey, number>;
    for (const criterion of TRAINER_CRITERIA) {
      criteria[criterion.key] = group.reduce((sum, row) => sum + Number(row[criterion.key] ?? 0), 0) / group.length;
    }
    const sortedCriteria = TRAINER_CRITERIA
      .map((criterion) => ({ key: criterion.key, label: criterion.label, value: criteria[criterion.key] }))
      .sort((a, b) => a.value - b.value);
    const sessionKeys = new Set(group.map((row) => `${isoDate(row.tanggal as string)}|${formatJam(String(row.jam_mulai))}|${formatJam(String(row.jam_selesai))}`));
    const sortedBatches = Array.from(new Set(group.map((row) => String(row.batch ?? "").trim()).filter(Boolean)))
      .sort((a, b) => batchSortValue(a) - batchSortValue(b));
    let trend: TrainerRank["trend"] = null;
    if (sortedBatches.length >= 2) {
      const latestBatch = sortedBatches[sortedBatches.length - 1];
      const previousBatch = sortedBatches[sortedBatches.length - 2];
      const averageFor = (batch: string) => {
        const list = group.filter((row) => String(row.batch ?? "").trim() === batch);
        return list.reduce((sum, row) => sum + Number(row.rata_rata ?? 0), 0) / Math.max(1, list.length);
      };
      trend = { delta: Number((averageFor(latestBatch) - averageFor(previousBatch)).toFixed(2)), previousBatch, latestBatch };
    }
    return {
      trainer,
      average,
      responses: group.length,
      minutes: uniqueMinutes(group as Array<{ trainer: string; tanggal: string; jam_mulai: string; jam_selesai: string; durasi_menit: number }>),
      sessions: sessionKeys.size,
      batches: sortedBatches,
      lastDate: isoDate((group[0]?.tanggal as string) ?? ""),
      criteria,
      weakest: sortedCriteria[0],
      strongest: sortedCriteria[sortedCriteria.length - 1],
      trend,
    };
  });

  const ranking: TrainerRank[] = rankingBase
    .map((entry) => {
      const tone = toneFor(entry.average, entry.weakest.value, entry.trend?.delta ?? null);
      return { ...entry, tone, action: actionFor(tone, entry) };
    })
    .sort((a, b) => b.average - a.average || b.responses - a.responses || a.trainer.localeCompare(b.trainer, "id"));

  const criteria = TRAINER_CRITERIA.map((criterion) => {
    const values = filtered.map((row) => Number(row[criterion.key] ?? 0));
    return {
      key: criterion.key,
      label: criterion.label,
      question: criterion.question,
      average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
      lowCount: values.filter((value) => value <= 2).length,
    };
  });

  const batchList = Array.from(new Set(filtered.map((row) => String(row.batch ?? "").trim()).filter(Boolean)))
    .sort((a, b) => batchSortValue(a) - batchSortValue(b));
  const series = ranking.map((entry) => {
    const points: TrainerBatchPoint[] = batchList
      .map((batch) => {
        const list = (groupByTrainer.get(entry.trainer) ?? []).filter((row) => String(row.batch ?? "").trim() === batch);
        if (!list.length) return null;
        return {
          batch,
          average: list.reduce((sum, row) => sum + Number(row.rata_rata ?? 0), 0) / list.length,
          responses: list.length,
        };
      })
      .filter((point): point is TrainerBatchPoint => point !== null);
    return { trainer: entry.trainer, points, delta: entry.trend?.delta ?? null };
  });

  const totalResponses = filtered.length;
  const totalAverage = totalResponses ? filtered.reduce((sum, row) => sum + Number(row.rata_rata ?? 0), 0) / totalResponses : 0;
  const totalMinutes = uniqueMinutes(filtered as Array<{ trainer: string; tanggal: string; jam_mulai: string; jam_selesai: string; durasi_menit: number }>);
  const totalSessions = new Set(filtered.map((row) => `${String(row.trainer ?? "").trim()}|${isoDate(row.tanggal as string)}|${formatJam(String(row.jam_mulai))}|${formatJam(String(row.jam_selesai))}`)).size;

  const sessions = filtered.slice(0, 250).map((row) => ({
    id_peserta: Number(row.id_peserta),
    nip: String(row.nip ?? ""),
    nama_peserta: String(row.nama_peserta ?? ""),
    batch: String(row.batch ?? ""),
    trainer: String(row.trainer ?? ""),
    day_ke: Number(row.day_ke ?? 0),
    tanggal: isoDate(row.tanggal as string),
    jam_mulai: formatJam(String(row.jam_mulai)),
    jam_selesai: formatJam(String(row.jam_selesai)),
    durasi_menit: Number(row.durasi_menit ?? 0),
    rata_rata: Number(row.rata_rata ?? 0),
    hal_terbaik: String(row.hal_terbaik ?? ""),
    perbaikan: String(row.perbaikan ?? ""),
    sumber: String(row.sumber ?? "portal"),
    created_at: String(row.created_at ?? ""),
    scores: criteriaRecord(row),
  }));

  const comments = {
    good: sessions.map((row) => row.hal_terbaik.trim()).filter(Boolean).slice(0, 12),
    improve: sessions.map((row) => row.perbaikan.trim()).filter(Boolean).slice(0, 12),
  };

  const recommendations = ranking
    .filter((entry) => entry.tone !== "good")
    .slice(0, 12)
    .map((entry) => {
      const steps: string[] = [];
      if (entry.weakest.value < 4) steps.push(`Latihan/coaching pada aspek ${entry.weakest.label} (${entry.weakest.value.toFixed(2)}/5).`);
      const lowCriteria = TRAINER_CRITERIA
        .map((criterion) => ({ label: criterion.label, value: entry.criteria[criterion.key] }))
        .filter((criterion) => criterion.value < 3.5)
        .sort((a, b) => a.value - b.value);
      for (const criterion of lowCriteria.slice(0, 2)) {
        if (criterion.label !== entry.weakest.label) steps.push(`Tinjau kembali cara penyampaian pada aspek ${criterion.label}.`);
      }
      if (entry.trend && entry.trend.delta < 0) steps.push(`Bandingkan sesi ${entry.trend.latestBatch} dengan ${entry.trend.previousBatch} untuk mencari penyebab penurunan.`);
      if (!steps.length) steps.push("Lakukan observasi kelas dan berikan umpan balik individual.");
      steps.push("Jadwalkan review hasil perbaikan pada sesi/batch berikutnya.");
      return {
        trainer: entry.trainer,
        tone: entry.tone,
        headline: `Rata-rata ${entry.average.toFixed(2)}/5 dari ${entry.responses} penilaian · aspek terlemah ${entry.weakest.label} (${entry.weakest.value.toFixed(2)}/5).`,
        steps,
      };
    });

  return {
    generatedAt: todayJakarta(),
    batches,
    trainers,
    filters: { batch: batchFilter, trainer: trainerFilter },
    totals: {
      responses: totalResponses,
      trainers: groupByTrainer.size,
      average: totalAverage,
      minutes: totalMinutes,
      sessions: totalSessions,
      participants: new Set(filtered.map((row) => Number(row.id_peserta))).size,
    },
    ranking,
    criteria,
    series,
    sessions,
    comments,
    recommendations,
  };
}

export async function getTrainerOptionsForAdmin() {
  await ensureTrainerEvaluationTable();
  const [rows] = await db.execute("SELECT DISTINCT trainer FROM penilaian_trainer WHERE TRIM(COALESCE(trainer,''))<>'' ORDER BY trainer");
  return (rows as Array<{ trainer: string }>).map((row) => row.trainer);
}
