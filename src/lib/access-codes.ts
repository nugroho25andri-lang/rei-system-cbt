import { randomInt } from "node:crypto";
import { db } from "@/lib/db";

const ADMIN_DAYS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export type AccessCodes = { periode_mulai: string; periode_selesai: string; kode: Record<string, string> };

function jakartaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function plusDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00+07:00`);
  value.setDate(value.getDate() + amount);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}
function makeCode() {
  return Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}
async function readTokens() {
  const [rows] = await db.execute("SELECT day, token_code FROM tokens ORDER BY id ASC");
  return rows as Array<{ day: string; token_code: string }>;
}
export async function getActiveAccessCodes(): Promise<AccessCodes> {
  let rows = await readTokens();
  if (!rows.length) {
    for (const day of ADMIN_DAYS) await db.execute("INSERT INTO tokens (day, token_code) VALUES (?, ?)", [day, makeCode()]);
    rows = await readTokens();
  }
  const kode: Record<string, string> = {};
  for (const row of rows) kode[String(row.day).trim()] = String(row.token_code).trim();
  const start = jakartaToday();
  return { periode_mulai: start, periode_selesai: plusDays(start, 13), kode };
}
export async function regenerateAccessCodes(): Promise<AccessCodes> {
  for (const day of ADMIN_DAYS) {
    const [rows] = await db.execute("SELECT id FROM tokens WHERE LOWER(TRIM(day)) = LOWER(?) LIMIT 1", [day]);
    const code = makeCode();
    if ((rows as Array<{ id: number }>)[0]) {
      await db.execute("UPDATE tokens SET token_code = ?, updated_at = NOW() WHERE id = ?", [code, (rows as Array<{ id: number }>)[0].id]);
    } else {
      await db.execute("INSERT INTO tokens (day, token_code) VALUES (?, ?)", [day, code]);
    }
  }
  return getActiveAccessCodes();
}
