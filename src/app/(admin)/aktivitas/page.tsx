import { activityLabel, ACTIVITY_TONE } from "@/lib/activity";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { btnGhost, btnPrimary, Card, inputClass, PageHeader, selectClass, Stat, TableWrap, tdClass, thClass } from "@/components/ui";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  username: string;
  nama: string;
  role: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | Date;
};

const PAGE_SIZE = 100;

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function roleTone(role: string) {
  if (role === "superadmin") return "border-gold-500/40 bg-gold-200/40 text-rei-900";
  if (role === "admin") return "border-sky-200 bg-sky-50 text-sky-700";
  if (role === "hr_staff") return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-rei-900/10 bg-white text-rei-900/60";
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ q?: string; action?: string; page?: string }> }) {
  await requireRole(["superadmin"]);
  const params = await searchParams;
  const q = String(params.q ?? "").trim();
  const action = String(params.action ?? "").trim();
  const page = Math.max(1, Math.trunc(Number(params.page ?? 1)) || 1);

  const where: string[] = [];
  const values: string[] = [];
  if (q) {
    where.push("(username LIKE ? OR nama LIKE ? OR detail LIKE ? OR ip_address LIKE ?)");
    const pattern = `%${q}%`;
    values.push(pattern, pattern, pattern, pattern);
  }
  if (action) {
    where.push("action = ?");
    values.push(action);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await db.execute(
    `SELECT COUNT(*) total FROM admin_activity_log ${whereSql}`,
    values,
  );
  const total = Number((countRows as Array<{ total: number }>)[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const [rows] = await db.execute(
    `SELECT id,username,nama,role,action,entity,entity_id,detail,ip_address,user_agent,created_at
     FROM admin_activity_log ${whereSql}
     ORDER BY id DESC LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    values,
  );
  const logs = rows as Row[];

  const [summaryRows] = await db.execute(
    `SELECT
       COUNT(*) total,
       SUM(DATE(created_at)=CURDATE()) today,
       COUNT(DISTINCT username) admins,
       SUM(action='login_failed') failed
     FROM admin_activity_log`,
  );
  const summary = (summaryRows as Array<{ total: number; today: number | null; admins: number; failed: number | null }>)[0];
  const [actionRows] = await db.execute("SELECT DISTINCT action FROM admin_activity_log ORDER BY action ASC");
  const actionOptions = (actionRows as Array<{ action: string }>).map((row) => row.action);

  function pageHref(target: number) {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (action) query.set("action", action);
    if (target > 1) query.set("page", String(target));
    const text = query.toString();
    return text ? `/aktivitas?${text}` : "/aktivitas";
  }

  return (
    <>
      <PageHeader
        title="Log Aktivitas Admin"
        description="Jejak audit seluruh aksi admin: login, perubahan soal, koreksi nilai, akun, dan backup."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Aktivitas" value={Number(summary?.total ?? 0).toLocaleString("id-ID")} hint="Seluruh catatan tersimpan" />
        <Stat label="Hari Ini" value={Number(summary?.today ?? 0).toLocaleString("id-ID")} hint="Aktivitas tanggal berjalan" />
        <Stat label="Admin Aktif" value={Number(summary?.admins ?? 0).toLocaleString("id-ID")} hint="Username berbeda" />
        <Stat label="Login Gagal" value={Number(summary?.failed ?? 0).toLocaleString("id-ID")} hint="Perlu perhatian keamanan" />
      </div>

      <Card className="mb-6" title="Filter" description="Cari berdasarkan nama, username, detail, atau IP.">
        <form method="get" className="flex flex-wrap items-end gap-2.5">
          <label className="grid flex-1 gap-1 text-[11px] font-semibold uppercase tracking-wide text-rei-900/55">
            Pencarian
            <input name="q" defaultValue={q} placeholder="Nama, username, detail, IP..." className={inputClass} />
          </label>
          <label className="grid min-w-[190px] gap-1 text-[11px] font-semibold uppercase tracking-wide text-rei-900/55">
            Jenis aksi
            <select name="action" defaultValue={action} className={selectClass}>
              <option value="">Semua aksi</option>
              {actionOptions.map((item) => <option key={item} value={item}>{activityLabel(item)}</option>)}
            </select>
          </label>
          <button type="submit" className={btnPrimary}>Terapkan</button>
          <a href="/aktivitas" className={btnGhost}>Reset</a>
        </form>
      </Card>

      <Card
        title="Riwayat Aktivitas"
        description={`Menampilkan ${logs.length} dari ${total.toLocaleString("id-ID")} catatan. Halaman ${currentPage} dari ${totalPages}.`}
      >
        {logs.length ? (
          <TableWrap>
            <table className="min-w-full">
              <thead className="bg-rei-50/70">
                <tr>
                  <th className={thClass}>Waktu</th>
                  <th className={thClass}>Admin</th>
                  <th className={thClass}>Aksi</th>
                  <th className={thClass}>Detail</th>
                  <th className={thClass}>IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rei-900/5">
                {logs.map((row) => (
                  <tr key={row.id} className="hover:bg-gold-50/40">
                    <td className={`${tdClass} whitespace-nowrap text-xs text-rei-900/70`}>{formatDate(row.created_at)}</td>
                    <td className={tdClass}>
                      <span className="block font-semibold">{row.nama || row.username}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-rei-900/55">
                        <span>{row.username}</span>
                        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase ${roleTone(row.role)}`}>{row.role || "-"}</span>
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${ACTIVITY_TONE[row.action] ?? "border-rei-900/10 bg-white text-rei-900/70"}`}>
                        {activityLabel(row.action)}
                      </span>
                    </td>
                    <td className={`${tdClass} max-w-[560px]`}>
                      <span className="block text-[13px] leading-relaxed">{row.detail || "-"}</span>
                      {(row.entity || row.entity_id) && (
                        <span className="mt-1 block text-[11px] text-rei-900/45">
                          {row.entity}{row.entity_id ? ` #${row.entity_id}` : ""}
                        </span>
                      )}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap font-mono text-[11px] text-rei-900/55`} title={row.user_agent ?? ""}>
                      {row.ip_address || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <p className="py-10 text-center text-sm text-rei-900/50">Belum ada aktivitas yang cocok dengan filter.</p>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-rei-900/10 pt-4">
            <span className="text-xs text-rei-900/55">Halaman {currentPage} dari {totalPages}</span>
            <div className="flex gap-2">
              {currentPage > 1 ? <a href={pageHref(currentPage - 1)} className={btnGhost}>Sebelumnya</a> : <span className={`${btnGhost} cursor-not-allowed opacity-40`}>Sebelumnya</span>}
              {currentPage < totalPages ? <a href={pageHref(currentPage + 1)} className={btnGhost}>Berikutnya</a> : <span className={`${btnGhost} cursor-not-allowed opacity-40`}>Berikutnya</span>}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
