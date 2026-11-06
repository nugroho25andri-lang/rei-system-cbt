import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card, PageHeader, Stat, TableWrap, tdClass, thClass } from "@/components/ui";

export const dynamic = "force-dynamic";

type TableRow = {
  name: string;
  engine_name: string | null;
  rows_est: number | null;
  data_mb: number | null;
  index_mb: number | null;
  total_mb: number | null;
  collation: string | null;
};

type KeyCount = { label: string; total: number };

const KEY_TABLES: Array<[string, string]> = [
  ["soal", "Bank soal"],
  ["peserta", "Peserta"],
  ["jawaban_peserta", "Jawaban peserta"],
  ["admins", "Akun admin"],
  ["tokens", "Token ujian"],
  ["penilaian_day5", "Penilaian Day 5"],
  ["penilaian_day6", "Penilaian Day 6"],
  ["penilaian_manual", "Nilai AADL"],
  ["admin_activity_log", "Log aktivitas"],
];

function number(value: unknown) {
  return Number(value ?? 0);
}

export default async function DatabasePage() {
  await requireRole(["superadmin"]);

  const [[infoRows], [summaryRows], [tableRows], [logRows]] = await Promise.all([
    db.execute("SELECT DATABASE() AS name, VERSION() AS version, @@character_set_database AS charset, @@collation_database AS collation"),
    db.execute(
      "SELECT COUNT(*) AS tables, COALESCE(SUM(table_rows),0) AS rows_est, ROUND(COALESCE(SUM(data_length+index_length),0)/1024/1024,2) AS size_mb FROM information_schema.tables WHERE table_schema=DATABASE()",
    ),
    db.execute(
      `SELECT table_name AS name, engine AS engine_name, table_rows AS rows_est,
              ROUND(data_length/1024/1024,2) AS data_mb,
              ROUND(index_length/1024/1024,2) AS index_mb,
              ROUND((data_length+index_length)/1024/1024,2) AS total_mb,
              table_collation AS collation
       FROM information_schema.tables
       WHERE table_schema=DATABASE()
       ORDER BY (data_length+index_length) DESC, table_name ASC`,
    ),
    db.execute("SELECT COUNT(*) AS total, MAX(created_at) AS last_log FROM admin_activity_log"),
  ]);

  const info = (infoRows as Array<{ name: string; version: string; charset: string; collation: string }>)[0];
  const summary = (summaryRows as Array<{ tables: number; rows_est: number; size_mb: number }>)[0];
  const tables = tableRows as TableRow[];
  const logInfo = (logRows as Array<{ total: number; last_log: string | Date | null }>)[0];

  const counts = await Promise.all(KEY_TABLES.map(async ([table, label]) => {
    try {
      const [rows] = await db.execute(`SELECT COUNT(*) AS total FROM \`${table}\``);
      return { label, total: number((rows as Array<{ total: number }>)[0]?.total) };
    } catch {
      return { label, total: 0 };
    }
  }));
  const keyCounts: KeyCount[] = counts;

  return (
    <>
      <PageHeader
        title="Database"
        description="Ringkasan kondisi database MySQL. Halaman ini hanya menampilkan statistik, bukan isi data sensitif."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Nama Database" value={<span className="font-mono text-2xl">{info?.name || "-"}</span>} hint={`${info?.charset || "-"} · ${info?.collation || "-"}`} />
        <Stat label="Versi MySQL" value={info?.version || "-"} hint="Server database aktif" />
        <Stat label="Jumlah Tabel" value={number(summary?.tables).toLocaleString("id-ID")} hint="Seluruh tabel di database" />
        <Stat label="Total Ukuran" value={`${number(summary?.size_mb).toLocaleString("id-ID")} MB`} hint={`${number(summary?.rows_est).toLocaleString("id-ID")} baris (estimasi)`} />
      </div>

      <Card className="mb-6" title="Tabel Penting" description="Jumlah baris pasti untuk tabel utama aplikasi.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {keyCounts.map((item) => (
            <div key={item.label} className="rounded-xl border border-rei-900/10 bg-[#faf8fa] px-3.5 py-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-rei-900/50">{item.label}</span>
              <strong className="mt-1 block text-xl font-extrabold text-rei-900">{item.total.toLocaleString("id-ID")}</strong>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Daftar Tabel"
        description={`Diurutkan dari ukuran terbesar. Estimasi baris InnoDB bersifat perkiraan. Log aktivitas: ${number(logInfo?.total).toLocaleString("id-ID")} catatan.`}
      >
        <TableWrap>
          <table className="min-w-full">
            <thead className="bg-rei-50/70">
              <tr>
                <th className={thClass}>Tabel</th>
                <th className={thClass}>Engine</th>
                <th className={thClass}>Estimasi Baris</th>
                <th className={thClass}>Data</th>
                <th className={thClass}>Index</th>
                <th className={thClass}>Total</th>
                <th className={thClass}>Collation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rei-900/5">
              {tables.map((table) => (
                <tr key={table.name} className="hover:bg-gold-50/40">
                  <td className={`${tdClass} font-mono text-[12.5px] font-semibold`}>{table.name}</td>
                  <td className={tdClass}>{table.engine_name || "-"}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{number(table.rows_est).toLocaleString("id-ID")}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{number(table.data_mb).toFixed(2)} MB</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{number(table.index_mb).toFixed(2)} MB</td>
                  <td className={`${tdClass} whitespace-nowrap font-semibold`}>{number(table.total_mb).toFixed(2)} MB</td>
                  <td className={`${tdClass} whitespace-nowrap text-[11px] text-rei-900/55`}>{table.collation || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </>
  );
}
