export type KeywordWeight = { kata_kunci: string; bobot: number };

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pecah teks kata kunci (dipisah koma) menjadi daftar berbobot.
 * Setiap kata kunci boleh ditulis "kata kunci:5" atau "kata kunci=5".
 * Kata kunci tanpa bobot dibagi rata dari sisa bobot soal.
 */
export function parseKeywordText(text: string, totalBobot: number): KeywordWeight[] {
  const tokens = text
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) return [];

  const parsed = tokens.map((token) => {
    const match = token.match(/^(.*?)[:=]\s*(\d+(?:[.,]\d+)?)$/);
    if (!match) return { kata_kunci: token.replace(/[:=]\s*$/, "").trim(), bobot: null as number | null };
    return { kata_kunci: match[1].trim(), bobot: Number(match[2].replace(",", ".")) };
  }).filter((item) => item.kata_kunci);

  const explicitTotal = parsed.reduce((sum, item) => sum + (item.bobot && item.bobot > 0 ? item.bobot : 0), 0);
  const automatic = parsed.filter((item) => !item.bobot || item.bobot <= 0);
  const remaining = Math.max(0, Number(totalBobot) - explicitTotal);
  const fallback = automatic.length
    ? remaining > 0
      ? remaining / automatic.length
      : Number(totalBobot) / parsed.length
    : 0;

  return parsed.map((item) => ({
    kata_kunci: item.kata_kunci,
    bobot: round2(item.bobot && item.bobot > 0 ? item.bobot : fallback || 1),
  }));
}

/** Nilai esai otomatis dari kata kunci yang muncul pada jawaban peserta. */
export function scoreEssay(answer: string, keywords: KeywordWeight[], maxScore: number) {
  const normalized = normalizeText(answer);
  if (!normalized || !keywords.length) return { score: 0, matched: [] as string[] };
  const matched: string[] = [];
  let score = 0;
  for (const keyword of keywords) {
    const needle = normalizeText(keyword.kata_kunci);
    if (!needle) continue;
    if (normalized.includes(needle)) {
      matched.push(keyword.kata_kunci);
      score += Number(keyword.bobot) || 0;
    }
  }
  return { score: round2(Math.min(score, Math.max(0, maxScore))), matched };
}
