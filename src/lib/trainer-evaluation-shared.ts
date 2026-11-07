export const TRAINER_CRITERIA = [
  { key: "nilai_1", label: "Penguasaan Materi", question: "Trainer menguasai materi yang disampaikan." },
  { key: "nilai_2", label: "Kejelasan", question: "Trainer menjelaskan materi dengan jelas dan mudah dipahami." },
  { key: "nilai_3", label: "Komunikasi", question: "Trainer berkomunikasi dengan baik dan mudah dimengerti." },
  { key: "nilai_4", label: "Sistematis", question: "Trainer menyampaikan materi secara terstruktur." },
  { key: "nilai_5", label: "Interaksi", question: "Trainer melibatkan trainee dalam proses pembelajaran." },
  { key: "nilai_6", label: "Responsiveness", question: "Trainer mampu menjawab pertanyaan trainee dengan baik." },
  { key: "nilai_7", label: "Pengelolaan Kelas", question: "Trainer mampu menjaga suasana kelas tetap kondusif." },
  { key: "nilai_8", label: "Metode Mengajar", question: "Trainer menggunakan pembelajaran yang menarik dan efektif." },
  { key: "nilai_9", label: "Kepedulian", question: "Trainer memperhatikan pemahaman setiap trainee." },
  { key: "nilai_10", label: "Overall Satisfaction", question: "Secara keseluruhan saya puas dengan proses pembelajaran yang diberikan oleh trainer." },
] as const;

export const SCORE_VALUES = [1, 2, 3, 4, 5] as const;

export const SCORE_LABELS: Record<number, string> = {
  1: "Sangat kurang",
  2: "Kurang",
  3: "Cukup",
  4: "Baik",
  5: "Sangat baik",
};

export type TrainerCriterionKey = (typeof TRAINER_CRITERIA)[number]["key"];

export type EvaluationFormState = { ok?: boolean; error?: string; success?: string } | null;

export function normalizeBatch(value: string) {
  return String(value ?? "").toLowerCase().replace(/batch/g, "").replace(/[^a-z0-9]/g, "");
}

/** Pisahkan nama trainer pada satu sesi rundown (mis. "Andri, Bu Novi & Dana"). */
export function splitTrainerNames(value: string) {
  return String(value ?? "")
    .split(/[,;/&]+|\bdan\b/gi)
    .map((entry) => entry.replace(/\(.*?\)/g, "").trim())
    .filter(Boolean);
}

export function maskIdentity() {
  return "••••••";
}

function toMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? "").trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function durationMinutes(start: string, end: string) {
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (from === null || to === null || to <= from) return 0;
  return to - from;
}

export function formatDuration(totalMinutes: number) {
  const total = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (total < 60) return `${total} mnt`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours} j ${minutes} mnt` : `${hours} jam`;
}

export function formatJam(value: string | null | undefined) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? "").trim());
  if (!match) return String(value ?? "-");
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function dateParts(value: string | Date) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() };
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? "").trim());
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function formatTanggal(value: string | Date) {
  const parts = dateParts(value);
  if (!parts) return String(value ?? "-");
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}

export function formatTanggalShort(value: string | Date) {
  const parts = dateParts(value);
  if (!parts) return String(value ?? "-");
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}

export function isoDate(value: string | Date) {
  const parts = dateParts(value);
  if (!parts) return "";
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function batchSortValue(value: string) {
  const numeric = Number(String(value ?? "").replace(/[^0-9]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}
