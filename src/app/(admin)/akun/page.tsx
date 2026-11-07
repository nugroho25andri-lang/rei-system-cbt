import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { btnPrimary, Card, inputClass, inputCompact, Notice, PageHeader, selectClass, Stat, TableWrap, tdClass, thClass } from "@/components/ui";
import { createAkunAction, resetPasswordAkunAction, toggleAkunAction, updateRoleAkunAction } from "./actions";

type AdminRow = { id: number; username: string; nama_trainer: string; role: "superadmin" | "admin" | "hr_staff"; is_active: number; created_at: string | Date };

const messages: Record<string, string> = {
  created: "Akun baru berhasil dibuat dan sudah bisa dipakai login.",
  exists: "Username tersebut sudah dipakai. Pilih username lain.",
  "invalid-username": "Username wajib 3–50 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, atau strip.",
  "invalid-nama": "Nama wajib diisi 2–100 karakter.",
  "invalid-password": "Password minimal 6 karakter.",
  "invalid-role": "Role yang dipilih tidak valid.",
  password: "Password akun berhasil direset.",
  role: "Role akun berhasil diperbarui dan langsung berlaku.",
  activated: "Akun berhasil diaktifkan.",
  deactivated: "Akun berhasil dinonaktifkan dan tidak bisa login.",
  protected: "Akun Super Admin tidak dapat diubah dari halaman ini.",
  notfound: "Akun tidak ditemukan.",
};

const errorMessages = new Set(["exists", "invalid-username", "invalid-nama", "invalid-password", "invalid-role", "protected", "notfound"]);

const roleLabel: Record<AdminRow["role"], string> = { superadmin: "Super Admin", admin: "Admin", hr_staff: "HR Staff" };
const roleBadge: Record<AdminRow["role"], string> = {
  superadmin: "bg-gold-200 text-gold-600 ring-1 ring-gold-500/40",
  admin: "bg-rei-900 text-gold-200",
  hr_staff: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};
const smallButton = "inline-flex items-center justify-center rounded-lg border border-rei-900/15 bg-white px-2.5 py-1 text-[11px] font-bold text-rei-900 transition hover:border-gold-500 hover:bg-gold-200/40";

export default async function AkunPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const session = await requireRole(["superadmin", "admin"]);
  const isSuperadmin = session.role === "superadmin";
  const { msg } = await searchParams;
  const [rows] = await db.execute("SELECT id, username, nama_trainer, role, is_active, created_at FROM admins ORDER BY (role = 'superadmin') DESC, nama_trainer ASC");
  const accounts = rows as AdminRow[];
  const total = accounts.length;
  const superadminCount = accounts.filter((row) => row.role === "superadmin").length;
  const adminCount = accounts.filter((row) => row.role === "admin").length;
  const staffCount = accounts.filter((row) => row.role === "hr_staff").length;
  const activeCount = accounts.filter((row) => Number(row.is_active) === 1).length;

  return (
    <>
      <PageHeader title="Manajemen Akun" description={isSuperadmin ? "Buat akun Admin atau HR Staff, atur role, reset password, dan aktifkan/nonaktifkan akun." : "Buat akun Admin atau HR Staff. Pengelolaan akun yang sudah ada hanya dapat dilakukan Super Admin."} />
      {msg && messages[msg] && <Notice kind={errorMessages.has(msg) ? "error" : "success"}>{messages[msg]}</Notice>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Akun" value={total} hint={`${activeCount} aktif`} />
        <Stat label="Super Admin" value={superadminCount} hint="Akses penuh" />
        <Stat label="Admin" value={adminCount} hint="Tanpa manajemen akun" />
        <Stat label="HR Staff" value={staffCount} hint="Penilaian & rekap" />
      </div>

      <Card title="Tambah Akun Baru" description="Akun yang dibuat bisa langsung dipakai login. Role Super Admin tidak dapat dibuat dari form ini." className="mb-6">
        <form action={createAkunAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wide text-rei-900/50">Username
            <input className={inputClass} name="username" required minLength={3} maxLength={50} autoComplete="off" placeholder="contoh: hrd_budi" />
          </label>
          <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wide text-rei-900/50">Nama Lengkap
            <input className={inputClass} name="nama" required minLength={2} maxLength={100} autoComplete="off" placeholder="Nama yang tampil di dashboard" />
          </label>
          <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wide text-rei-900/50">Password Awal
            <input className={inputClass} type="text" name="password" required minLength={6} maxLength={255} autoComplete="new-password" placeholder="Minimal 6 karakter" />
          </label>
          <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wide text-rei-900/50">Role
            <select className={selectClass} name="role" defaultValue="hr_staff">
              <option value="hr_staff">HR Staff — penilaian & rekap</option>
              <option value="admin">Admin — akses penuh kecuali akun</option>
            </select>
          </label>
          <div className="sm:col-span-2 lg:col-span-4"><button type="submit" className={btnPrimary}>Buat Akun</button></div>
        </form>
      </Card>

      <Card title={`Daftar Akun (${total})`} description="Perubahan role dan status langsung berlaku. Password tersimpan sesuai mekanisme login aplikasi saat ini." bodyClassName="px-5 pb-4 pt-2">
        <TableWrap>
          <thead className="border-b border-rei-900/10"><tr>{["Nama", "Username", "Role", "Status", "Dibuat", "Aksi"].map((head) => <th key={head} className={thClass}>{head}</th>)}</tr></thead>
          <tbody className="divide-y divide-rei-900/10">
            {accounts.map((row) => (
              <tr key={row.id} className="hover:bg-gold-200/15">
                <td className={`${tdClass} font-semibold`}>{row.nama_trainer}</td>
                <td className={`${tdClass} font-mono text-xs`}>{row.username}</td>
                <td className={tdClass}><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${roleBadge[row.role]}`}>{roleLabel[row.role]}</span></td>
                <td className={tdClass}><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${Number(row.is_active) === 1 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{Number(row.is_active) === 1 ? "Aktif" : "Nonaktif"}</span></td>
                <td className={`${tdClass} whitespace-nowrap text-xs text-rei-900/60`}>{new Date(row.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                <td className={`${tdClass} min-w-[260px]`}>
                  {!isSuperadmin ? (
                    <span className="text-[11px] font-bold text-rei-900/45">Pengelolaan akun hanya untuk Super Admin</span>
                  ) : row.role === "superadmin" ? (
                    <span className="text-[11px] font-bold text-rei-900/45">Akun utama — terkunci</span>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <form action={updateRoleAkunAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="id" value={row.id} />
                        <select name="role" defaultValue={row.role} className={`${inputCompact} max-w-[110px]`}>
                          <option value="admin">Admin</option>
                          <option value="hr_staff">HR Staff</option>
                        </select>
                        <button type="submit" className={smallButton}>Ubah role</button>
                      </form>
                      <form action={toggleAkunAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="is_active" value={Number(row.is_active) === 1 ? "0" : "1"} />
                        <button type="submit" className={Number(row.is_active) === 1 ? "inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100" : smallButton}>{Number(row.is_active) === 1 ? "Nonaktifkan" : "Aktifkan"}</button>
                      </form>
                      <details className="rounded-lg border border-rei-900/10 bg-[#faf8fa] px-2.5 py-1.5">
                        <summary className="cursor-pointer text-[11px] font-bold text-rei-900/60">Reset password</summary>
                        <form action={resetPasswordAkunAction} className="mt-2 flex items-center gap-1.5">
                          <input type="hidden" name="id" value={row.id} />
                          <input className={`${inputCompact} max-w-[140px]`} type="text" name="password" required minLength={6} maxLength={255} autoComplete="new-password" placeholder="Password baru" />
                          <button type="submit" className={smallButton}>Simpan</button>
                        </form>
                      </details>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!accounts.length && <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-rei-900/50">Belum ada akun.</td></tr>}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
