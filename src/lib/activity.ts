import { headers } from "next/headers";
import { db } from "@/lib/db";

export type ActivitySession = { username: string; nama: string; role: string };

export const ACTIVITY_LABELS: Record<string, string> = {
  login: "Login",
  login_failed: "Login gagal",
  logout: "Logout",
  question_create: "Tambah soal",
  question_update: "Edit soal",
  question_delete: "Hapus soal",
  question_bulk: "Tambah soal massal",
  token_regenerate: "Generate token",
  account_create: "Tambah akun",
  account_password: "Reset password",
  account_role: "Ubah role",
  account_status: "Ubah status akun",
  score_save: "Simpan koreksi",
  recap_save: "Simpan rekap nilai",
  answer_delete: "Hapus jawaban",
  aadl_save: "Simpan nilai AADL",
  day6_save: "Simpan nilai Day 6",
  participant_create: "Tambah peserta",
  participant_update: "Edit peserta",
  participant_delete: "Hapus peserta",
  participant_import: "Impor peserta",
  backup: "Backup database",
};

export function activityLabel(action: string) {
  return ACTIVITY_LABELS[action] ?? action;
}

export const ACTIVITY_TONE: Record<string, string> = {
  login: "bg-emerald-50 text-emerald-700 border-emerald-200",
  login_failed: "bg-rose-50 text-rose-700 border-rose-200",
  logout: "bg-slate-50 text-slate-600 border-slate-200",
  question_delete: "bg-rose-50 text-rose-700 border-rose-200",
  participant_delete: "bg-rose-50 text-rose-700 border-rose-200",
  answer_delete: "bg-rose-50 text-rose-700 border-rose-200",
  account_status: "bg-amber-50 text-amber-700 border-amber-200",
  backup: "bg-sky-50 text-sky-700 border-sky-200",
};

type ActivityInput = {
  action: string;
  session?: ActivitySession | null;
  username?: string;
  nama?: string;
  role?: string;
  entity?: string;
  entityId?: string | number | null;
  detail?: string;
};

export async function logAdminActivity(input: ActivityInput): Promise<void> {
  try {
    const requestHeaders = await headers();
    const forwarded = requestHeaders.get("cf-connecting-ip") ?? requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip") ?? "";
    const ipAddress = forwarded.split(",")[0].trim().slice(0, 45) || null;
    const userAgent = (requestHeaders.get("user-agent") ?? "").slice(0, 255) || null;

    const username = String(input.session?.username ?? input.username ?? "system").slice(0, 50);
    const nama = String(input.session?.nama ?? input.nama ?? "").slice(0, 100);
    const role = String(input.session?.role ?? input.role ?? "").slice(0, 20);
    const entity = String(input.entity ?? "").slice(0, 50);
    const entityId = input.entityId === null || input.entityId === undefined ? null : String(input.entityId).slice(0, 100);
    const detail = String(input.detail ?? "").slice(0, 500);

    await db.execute(
      "INSERT INTO admin_activity_log (username,nama,role,action,entity,entity_id,detail,ip_address,user_agent,created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())",
      [username, nama, role, input.action.slice(0, 50), entity, entityId, detail, ipAddress, userAgent],
    );
  } catch (error) {
    // Logging tidak boleh menggagalkan aksi utama.
    console.error("Gagal mencatat aktivitas admin", error);
  }
}
