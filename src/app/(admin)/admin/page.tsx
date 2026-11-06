import { requireAdminSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getActiveAccessCodes } from "@/lib/access-codes";
import { activityLabel, ACTIVITY_TONE } from "@/lib/activity";
import { regenerateCodesAction } from "./actions";
import { savePesertaAction } from "../peserta/actions";
import DeleteParticipantButton from "./delete-participant-button";
import ScoreAnalytics from "./score-analytics";
import { btnGhost, btnPrimary, Card, inputClass, Notice, PageHeader, Stat, TableWrap, tdClass, thClass } from "@/components/ui";

type ActivityRow = { id: number; username: string; nama: string; role: string; action: string; detail: string; created_at: string | Date };
type DashboardParticipant = { id: number; nip: string; nama_peserta: string; jabatan: string | null; batch: string; cabang: string | null; penempatan: string | null };
const participantMessages: Record<string, string> = {
  added: "Peserta baru berhasil ditambahkan.",
  updated: "Data peserta berhasil diperbarui.",
  deleted: "Peserta berhasil dihapus.",
  invalid: "Data peserta belum lengkap atau tidak valid.",
};
const participantFields = ["nip", "nama_peserta", "jabatan", "batch", "cabang", "penempatan"] as const;

function shortTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date);
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ denied?: string; msg?: string }> }) {
  const session = await requireAdminSession();
  const { denied, msg } = await searchParams;
  const canManage = session.role === "superadmin" || session.role === "admin";
  const [questions, answers, kkmRows] = await Promise.all([
    db.execute("SELECT COUNT(*) AS total FROM soal"),
    db.execute("SELECT COUNT(*) AS total FROM jawaban_peserta"),
    db.execute("SELECT nilai_kkm FROM kkm LIMIT 1"),
  ]);
  const count = (result: unknown) => Number((result as [Array<{ total: number }>])[0][0]?.total ?? 0);
  const totalQuestions = count(questions);
  const totalAnswers = count(answers);
  const kkm = Number(((kkmRows as unknown as [Array<{ nilai_kkm: number }>, unknown])[0])[0]?.nilai_kkm ?? 0);
  const [databaseRows] = await db.execute("SELECT DATABASE() AS name");
  const databaseName = String((databaseRows as Array<{ name: string | null }>)[0]?.name ?? "");
  const access = await getActiveAccessCodes();
  const isSuperadmin = session.role === "superadmin";

  let recentActivity: ActivityRow[] = [];
  let activityToday = 0;
  let activityTotal = 0;
  let databaseTables = 0;
  let databaseSize = 0;
  let databaseVersion = "";
  let dashboardParticipants: DashboardParticipant[] = [];
  if (isSuperadmin) {
    const [participantRows] = await db.execute(
      "SELECT id,nip,nama_peserta,jabatan,batch,cabang,penempatan FROM peserta ORDER BY id DESC LIMIT 8",
    );
    dashboardParticipants = participantRows as DashboardParticipant[];
    const [activityRows] = await db.execute(
      "SELECT id,username,nama,role,action,detail,created_at FROM admin_activity_log ORDER BY id DESC LIMIT 8",
    );
    recentActivity = activityRows as ActivityRow[];
    const [activitySummary] = await db.execute(
      "SELECT COUNT(*) total, SUM(DATE(created_at)=CURDATE()) today FROM admin_activity_log",
    );
    const summaryRow = (activitySummary as Array<{ total: number; today: number | null }>)[0];
    activityTotal = Number(summaryRow?.total ?? 0);
    activityToday = Number(summaryRow?.today ?? 0);
    const [databaseRows] = await db.execute(
      "SELECT COUNT(*) tables, ROUND(COALESCE(SUM(data_length+index_length),0)/1024/1024,2) size_mb FROM information_schema.tables WHERE table_schema=DATABASE()",
    );
    const databaseRow = (databaseRows as Array<{ tables: number; size_mb: number }>)[0];
    databaseTables = Number(databaseRow?.tables ?? 0);
    databaseSize = Number(databaseRow?.size_mb ?? 0);
    const [versionRows] = await db.execute("SELECT VERSION() AS version");
    databaseVersion = String((versionRows as Array<{ version: string }>)[0]?.version ?? "");
  }

  const modules = [
    { href: "/jawaban-peserta", label: "Jawaban Peserta" },
    { href: "/koreksi", label: "Koreksi Jawaban" },
    { href: "/kelola-soal", label: "Kelola Soal Ujian" },
    ...(canManage ? [{ href: "/peserta", label: "Data Peserta" }] : []),
    { href: "/rekapitulasi", label: "Rekapitulasi Nilai" },
    { href: "/input-nilai", label: "Input Nilai AADL" },
    { href: "/test-day6", label: "Penilaian Day 6" },
    ...(session.role === "superadmin" ? [
      { href: "/aktivitas", label: "Log Aktivitas" },
      { href: "/database", label: "Database" },
      { href: "/akun", label: "Manajemen Akun" },
    ] : []),
  ];
  return (
    <>
      <PageHeader
        title="Dashboard Admin CBT"
        description={`Selamat datang, ${session.nama || session.username}. Semua data di bawah ini diambil langsung dari database MySQL.`}
        actions={<><span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />MySQL · {databaseName}</span><form action="/api/auth/logout" method="post"><button className={btnGhost} type="submit">Logout</button></form></>}
      />

      {denied && <Notice kind="error">Akun Anda tidak memiliki akses ke halaman tersebut.</Notice>}
      {msg && participantMessages[msg] && <Notice kind={msg === "invalid" ? "error" : "success"}>{participantMessages[msg]}</Notice>}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total Soal" value={totalQuestions} hint="Seluruh bank soal" />
        <Stat label="Jawaban Masuk" value={totalAnswers.toLocaleString("id-ID")} hint="Baris jawaban peserta" />
        <Stat label="Standar KKM" value={kkm} hint="Batas kelulusan" />
      </div>

      <ScoreAnalytics />

      {isSuperadmin && (
        <Card
          title="Kelola Data Peserta"
          description="Tambah, edit, dan hapus peserta langsung dari dashboard superadmin."
          className="mb-6"
          bodyClassName="px-5 pb-5 pt-4"
        >
          <form action={savePesertaAction} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <input type="hidden" name="return_to" value="dashboard" />
            {participantFields.map((name) => (
              <label key={name} className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rei-900/55">
                {name.replaceAll("_", " ")}
                <input className={inputClass} name={name} required={name === "nip" || name === "nama_peserta" || name === "batch"} type={name === "batch" ? "number" : "text"} />
              </label>
            ))}
            <div className="flex items-end sm:col-span-2 xl:col-span-4">
              <button type="submit" className={btnPrimary}>Tambah Peserta</button>
            </div>
          </form>

          <div className="mt-5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-rei-900/45">Peserta terbaru ({dashboardParticipants.length})</p>
            <TableWrap>
              <thead className="border-b border-rei-900/10">
                <tr>{["Peserta", "Batch", "Cabang", "Aksi"].map((head) => <th key={head} className={thClass}>{head}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-rei-900/10">
                {dashboardParticipants.map((row) => (
                  <tr key={row.id} className="hover:bg-gold-200/15">
                    <td className={tdClass}>
                      <span className="block font-semibold leading-tight">{row.nama_peserta}</span>
                      <span className="font-mono text-[11px] text-rei-900/50">{row.nip}</span>
                    </td>
                    <td className={tdClass}>{row.batch}</td>
                    <td className={tdClass}>{row.cabang || "-"}</td>
                    <td className={tdClass}>
                      <details className="group">
                        <summary className="cursor-pointer text-xs font-bold text-gold-600 hover:text-gold-500">Edit</summary>
                        <form action={savePesertaAction} className="mt-2 grid min-w-[260px] gap-2 rounded-xl border border-rei-900/10 bg-rei-100/50 p-3">
                          <input type="hidden" name="action" value="edit" />
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="return_to" value="dashboard" />
                          {participantFields.map((key) => (
                            <label key={key} className="grid gap-1 text-[11px] font-semibold uppercase tracking-wide text-rei-900/50">
                              {key.replaceAll("_", " ")}
                              <input className={inputClass} name={key} defaultValue={String(row[key] ?? "")} required={key === "nip" || key === "nama_peserta"} />
                            </label>
                          ))}
                          <button type="submit" className={btnPrimary}>Simpan</button>
                        </form>
                      </details>
                      <DeleteParticipantButton id={row.id} name={row.nama_peserta} />
                    </td>
                  </tr>
                ))}
                {!dashboardParticipants.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-rei-900/50">Belum ada data peserta.</td></tr>}
              </tbody>
            </TableWrap>
          </div>
        </Card>
      )}

      {isSuperadmin && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Aktivitas Hari Ini" value={activityToday.toLocaleString("id-ID")} hint="Aksi admin tercatat" />
            <Stat label="Total Log" value={activityTotal.toLocaleString("id-ID")} hint="Seluruh jejak audit" />
            <Stat label="Tabel Database" value={databaseTables.toLocaleString("id-ID")} hint="Tabel di database aktif" />
            <Stat label="Ukuran Database" value={`${databaseSize.toLocaleString("id-ID")} MB`} hint="Data dan index" />
          </div>

          <div className="mb-6 grid gap-6 xl:grid-cols-2">
            <Card
              title="Aktivitas Terbaru"
              description="Jejak audit tindakan admin dan backup."
              actions={<a href="/aktivitas" className={btnGhost}>Lihat semua</a>}
            >
              {recentActivity.length ? (
                <ul className="divide-y divide-rei-900/5">
                  {recentActivity.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="mt-0.5 w-[92px] shrink-0 text-[11px] font-semibold text-rei-900/45">{shortTime(item.created_at)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-bold text-rei-900">{item.nama || item.username}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${ACTIVITY_TONE[item.action] ?? "border-rei-900/10 bg-white text-rei-900/60"}`}>{activityLabel(item.action)}</span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-rei-900/60" title={item.detail}>{item.detail || "-"}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-rei-900/50">Belum ada aktivitas tercatat.</p>
              )}
            </Card>

            <Card
              title="Database"
              description="Statistik read-only dari MySQL."
              actions={<a href="/database" className={btnGhost}>Lihat detail</a>}
            >
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-rei-900/10 bg-[#faf8fa] px-3.5 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-rei-900/50">Nama database</dt>
                  <dd className="mt-1 font-mono text-sm font-bold text-rei-900">{databaseName}</dd>
                </div>
                <div className="rounded-xl border border-rei-900/10 bg-[#faf8fa] px-3.5 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-rei-900/50">Versi MySQL</dt>
                  <dd className="mt-1 text-sm font-bold text-rei-900">{databaseVersion || "-"}</dd>
                </div>
                <div className="rounded-xl border border-rei-900/10 bg-[#faf8fa] px-3.5 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-rei-900/50">Jumlah tabel</dt>
                  <dd className="mt-1 text-sm font-bold text-rei-900">{databaseTables.toLocaleString("id-ID")}</dd>
                </div>
                <div className="rounded-xl border border-rei-900/10 bg-[#faf8fa] px-3.5 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-rei-900/50">Total ukuran</dt>
                  <dd className="mt-1 text-sm font-bold text-rei-900">{databaseSize.toLocaleString("id-ID")} MB</dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-rei-900/45">Halaman database hanya menampilkan statistik. Isi kolom sensitif seperti password tidak ditampilkan.</p>
            </Card>
          </div>
        </>
      )}

      {canManage && (
        <Card
          title="Kode Akses Ujian"
          description={`Periode ${access.periode_mulai} sampai ${access.periode_selesai}`}
          actions={<form action={regenerateCodesAction}><button className={btnPrimary} type="submit">Generate Kode Baru</button></form>}
          className="mb-6"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(access.kode).map(([day, code]) => (
              <div key={day} className="rounded-xl border border-gold-500/30 bg-gradient-to-b from-gold-200/50 to-white px-3.5 py-3">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-rei-900/50">{day}</span>
                <strong className="mt-1 block font-mono text-[15px] font-extrabold tracking-wider text-rei-900">{code}</strong>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Modul CBT" description="Akses cepat ke seluruh modul administrasi.">
        <nav className="flex flex-wrap gap-2.5">
          {modules.map((item) => <a key={item.href} href={item.href} className={btnGhost}>{item.label}</a>)}
        </nav>
      </Card>
    </>
  );
}
