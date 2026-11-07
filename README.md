# REI System CBT

Aplikasi Computer Based Test (CBT) dan penilaian training Raja Emas Indonesia. Dibangun ulang dengan Next.js 16, React 19, dan MySQL 8.

## Fitur

- Portal peserta: input nama/NIP, token ujian, satu soal per layar, soal dan opsi diacak per peserta, timer per soal, auto-submit saat waktu habis atau peserta meninggalkan halaman.
- Admin: dashboard, jawaban peserta, koreksi, kelola soal, data peserta, rekapitulasi nilai, input nilai AADL, penilaian Day 6.
- Soal CBT dapat ditandai sebagai pretest atau posttest; keduanya tampil di rekap, tetapi hanya posttest dihitung ke total dan KKM.
- Superadmin: manajemen akun, log aktivitas admin, dan statistik database.
- Backup database otomatis setiap Sabtu pukul 00:00 ke `D:\backup-database`.

## Persyaratan

- Windows 10/11 (fitur backup otomatis memakai Task Scheduler).
- Node.js 20 atau lebih baru.
- MySQL 8 (Laragon, XAMPP, atau instalasi mandiri).
- Git.

## Clone dan jalankan

```powershell
git clone https://github.com/nugroho25andri-lang/rei-system-cbt.git
cd rei-system-cbt
npm install
Copy-Item .env.example .env.local
notepad .env.local
```

Isi `.env.local` minimal seperti ini:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=db_cbt_rei
SESSION_SECRET=ganti-dengan-teks-acak-minimal-32-karakter
COOKIE_SECURE=false
```

`SESSION_SECRET` wajib minimal 32 karakter. Set `COOKIE_SECURE=true` hanya jika aplikasi diakses lewat HTTPS.

`npm install` otomatis menjalankan `scripts/setup-backup.cjs`, yang mendaftarkan task backup Windows. Jika `.env.local` belum ada saat itu, backup tetap terdaftar dan baru berhasil setelah file tersebut dibuat.

Siapkan database:

```powershell
mysql -u root -e "CREATE DATABASE IF NOT EXISTS db_cbt_rei CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
cmd /c "mysql -u root db_cbt_rei < database\schema.sql"
```

Untuk database yang sudah ada sebelum fitur pretest/posttest, jalankan migrasi satu kali:

```powershell
cmd /c "mysql -u root db_cbt_rei < migrations\006_jenis_tes_pre_post.sql"
```

Buat akun superadmin pertama (ganti password sebelum dipakai):

```powershell
mysql -u root db_cbt_rei -e "INSERT INTO admins (username,password,nama_trainer,role,is_active) VALUES ('superadmin','GANTI_PASSWORD','Super Admin','superadmin',1);"
```

Build dan jalankan:

```powershell
npm run build
npm start
```

Buka `http://localhost:3100`. Dari komputer lain di jaringan kantor gunakan `http://IP-SERVER:3100`.

Alternatif Windows: klik dua kali `start-cbt.bat` untuk memasang dependency, build, lalu menjalankan server.

## Mengisi data dari backup

Repository ini hanya berisi skema tanpa data peserta/nilai. Untuk memulihkan data produksi:

```powershell
Expand-Archive D:\backup-database\cbt_rei_20261107_000000.zip -DestinationPath D:\backup-database\restore
cmd /c "mysql -u root db_cbt_rei < D:\backup-database\restore\cbt_rei_20261107_000000.sql"
```

## Backup otomatis

Backup berjalan setiap **Sabtu pukul 00:00** dan disimpan di `D:\backup-database` sebagai `cbt_rei_yyyyMMdd_HHmmss.zip`. ZIP berisi dump SQL seluruh tabel. ZIP yang lebih tua dari 90 hari dihapus otomatis, dan setiap backup dicatat di menu **Log Aktivitas**.

Perintah yang tersedia:

```powershell
npm run setup:backup   # daftarkan / perbarui task backup
npm run backup:now     # jalankan backup sekarang
schtasks /Query /TN "CBT REI - Backup Database" /V /FO LIST
```

Script backup membaca kredensial dari `.env.local`, mencari `mysqldump.exe` di Laragon/XAMPP/PATH, lalu menulis log ke `D:\backup-database\backup.log`.

Jika folder project dipindah atau di-clone ulang, jalankan `npm install` atau `npm run setup:backup` lagi agar path task menunjuk ke folder terbaru.

Tanpa hak Administrator, task berjalan sebagai user Windows dan hanya aktif saat user login. Untuk server yang menyala 24/7, jalankan dari PowerShell **sebagai Administrator**:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\register-backup-task.ps1
```

Dengan hak Administrator, task didaftarkan sebagai `SYSTEM` sehingga tetap berjalan saat server terkunci atau logout.

Lokasi backup bisa diubah lewat parameter atau environment variable:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1 -BackupDir "D:\backup\cbt"
$env:CBT_BACKUP_DIR = "D:\backup\cbt"
```

## Peran pengguna

| Role | Akses |
| --- | --- |
| `superadmin` | Semua menu, manajemen akun, log aktivitas, statistik database |
| `admin` | Dashboard, soal, peserta, koreksi, rekap, penilaian |
| `hr_staff` | Sama seperti admin untuk kebutuhan HR |

Akun tersimpan di tabel `admins`. Role dan status aktif dibaca ulang dari database pada setiap request, sehingga perubahan langsung berlaku.

## Struktur project

```text
src/app          halaman App Router (admin, peserta, API)
src/components   komponen UI bersama
src/lib          koneksi database, sesi, logging aktivitas
scripts          backup database dan pendaftaran Task Scheduler
database         skema SQL tanpa data
docs             panduan deploy online
public           aset publik
uploads          lampiran peserta (tidak di-commit)
```

## Dokumentasi deploy

Panduan lengkap menjalankan di Laragon, domain Hostinger, Cloudflare Tunnel, HTTPS, dan service Windows ada di [docs/PANDUAN-ONLINE-LARAGON-CLOUDFLARE.md](docs/PANDUAN-ONLINE-LARAGON-CLOUDFLARE.md).

## Catatan keamanan

- `.env.local`, folder `uploads`, dan file ZIP backup tidak masuk repository.
- Ganti password akun default sebelum dipakai.
- Password akun admin saat ini disimpan sebagai teks biasa. Untuk akses internet publik, migrasikan ke hash bcrypt.
- Jangan membuka port MySQL 3306 ke internet.
- Simpan salinan backup di drive atau cloud lain, bukan hanya di komputer server.
