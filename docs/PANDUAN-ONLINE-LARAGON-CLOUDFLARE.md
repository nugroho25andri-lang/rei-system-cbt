# Panduan Online CBT REI: Laragon + Domain Hostinger + Cloudflare Tunnel

Panduan ini menjelaskan cara menjalankan aplikasi CBT REI di komputer lokal (Laragon/Windows), lalu mengaksesnya dari internet memakai domain yang dibeli di Hostinger dan Cloudflare Tunnel.

Cocok untuk skala internal, ujian dengan peserta terbatas, dan komputer server yang bisa dibiarkan menyala.

## Alur singkat

1. Siapkan MySQL, user database, dan `.env.local`.
2. `npm ci`, `npm run build`, `npm run start`, uji di `localhost:3100`.
3. Tambahkan domain ke Cloudflare, lalu ganti nameserver di Hostinger.
4. Set SSL/TLS ke **Full** dan aktifkan **Always Use HTTPS**.
5. Buat Cloudflare Tunnel, pasang sebagai service Windows.
6. Tambahkan public hostname `cbt.domainanda.com` -> `http://127.0.0.1:3100`.
7. Jadikan Next.js dan MySQL service otomatis.
8. Ubah `COOKIE_SECURE=true`, restart, lalu uji dari HP/komputer lain.
9. Atur backup otomatis database setiap Sabtu pukul 00:00 ke `D:\backup-database`.
10. Uji ulang setelah reboot.

---

## 1. Ringkasan arsitektur

```
Peserta / Admin
      |
      | HTTPS (domain Hostinger)
      v
Cloudflare Edge  ---> Cloudflare Tunnel (outbound) ---> cloudflared di PC server
                                                              |
                                                              v
                                                   Next.js :3100 (localhost)
                                                              |
                                                              v
                                                   MySQL Laragon :3306
```

Poin penting:

- Tidak perlu port forwarding, tidak perlu IP publik statis, dan tidak perlu membuka port 80/443 di router.
- `cloudflared` membuat koneksi keluar dari PC ke Cloudflare. Cloudflare yang menerima pengunjung.
- Apache/Nginx Laragon tidak dipakai untuk menyajikan Next.js. Laragon dipakai untuk MySQL (dan Node.js bila tersedia).
- PC server harus menyala dan terhubung internet selama ujian. Jika PC mati, situs ikut mati.

---

## 2. Yang perlu disiapkan

1. Komputer server Windows yang selalu menyala.
2. Laragon dengan MySQL 8 (proyek ini memakai `db_cbt_rei`).
3. Node.js 20+ (mesin ini: Node 24.22.1, npm 11.19.1).
4. Domain dari Hostinger.
5. Akun Cloudflare gratis.
6. Koneksi internet yang stabil.

Cek versi di PowerShell:

```powershell
node -v
npm -v
```

---

## 3. Siapkan aplikasi di Laragon

### 3.1 Jalankan MySQL

Buka Laragon, pastikan MySQL berjalan. Cek dari terminal:

```powershell
& "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" -uroot -e "SELECT VERSION();"
```

### 3.2 Buat user database khusus

Jangan pakai `root` tanpa password untuk aplikasi yang online. Buat user terbatas:

```sql
CREATE USER 'cbt_app'@'127.0.0.1' IDENTIFIED BY 'GANTI_DENGAN_PASSWORD_PANJANG';
GRANT SELECT, INSERT, UPDATE, DELETE ON db_cbt_rei.* TO 'cbt_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

Jalankan lewat MySQL client:

```powershell
& "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" -uroot
```

Catatan: grant di atas hanya untuk operasi harian. Perubahan struktur tabel (migrasi) tetap dilakukan dengan `root`.

### 3.3 Buat `.env.local` produksi

Di folder proyek `C:\laragon\www\hr_raja_emas\cbt_rei`, buat `.env.local`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=cbt_app
DB_PASSWORD=GANTI_DENGAN_PASSWORD_PANJANG
DB_NAME=db_cbt_rei
SESSION_SECRET=GANTI_DENGAN_SECRET_ACAK_MINIMAL_32_KARAKTER
COOKIE_SECURE=false
```

Buat `SESSION_SECRET` acak:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Salin hasilnya ke `SESSION_SECRET`. Jangan bagikan nilai ini dan jangan commit ke Git (`.env.local` sudah masuk `.gitignore`).

`COOKIE_SECURE=false` untuk tahap awal. Nanti diubah menjadi `true` setelah HTTPS aktif (lihat bagian 7).

### 3.4 Build dan jalankan

```powershell
cd C:\laragon\www\hr_raja_emas\cbt_rei
npm ci
npm run build
npm run start
```

Buka `http://localhost:3100`. Pastikan halaman peserta dan login admin tampil.

Jangan memakai `npm run dev` untuk produksi. Selalu `npm run build` lalu `npm run start`.

### 3.5 Akses dari LAN (opsional)

Script `start` sudah memakai `-H 0.0.0.0 -p 3100`, jadi perangkat lain di jaringan yang sama bisa membuka:

```
http://IP-KOMPUTER-SERVER:3100
```

Izinkan Node.js di Windows Firewall untuk profil **Private** saja, jangan Public.

---

## 4. Pindahkan domain Hostinger ke Cloudflare

Cloudflare Tunnel memerlukan domain yang zone-nya aktif di Cloudflare.

### 4.1 Tambahkan domain ke Cloudflare

1. Login ke [dash.cloudflare.com](https://dash.cloudflare.com).
2. **Add a site** -> masukkan domain -> pilih paket **Free**.
3. Cloudflare akan memindai DNS. Periksa hasilnya.
4. Cloudflare menampilkan dua nameserver, misalnya:
   `ada.ns.cloudflare.com` dan `bob.ns.cloudflare.com` (nama bisa berbeda).

### 4.2 Ganti nameserver di Hostinger

1. Buka hPanel Hostinger -> **Domains**.
2. Pilih domain -> **DNS / Nameservers** -> **Change nameservers**.
3. Pilih **Custom nameservers**, isi dua nameserver dari Cloudflare.
4. Simpan dan tunggu propagasi. Biasanya 15 menit sampai 24 jam.

Di Cloudflare, status domain harus berubah menjadi **Active**.

### 4.3 Peringatan email dan DNS lain

Jika domain memakai email Hostinger (`nama@domain.com`), mengganti nameserver akan memindahkan pengelolaan DNS ke Cloudflare. Sebelum mengganti:

1. Catat semua record di Hostinger: **MX**, **TXT (SPF/DKIM)**, **CNAME**.
2. Setelah domain aktif di Cloudflare, pastikan record MX dan TXT tersebut ada.
3. Uji kirim/terima email setelah propagasi.

Jika domain saat ini dipakai website lain, pindahkan juga record A/CNAME website tersebut ke Cloudflare agar situs lama tetap berjalan. Jika email dan website tidak dipakai, bagian ini bisa dilewati.

### 4.4 Pengaturan SSL/TLS

Di Cloudflare:

1. **SSL/TLS -> Overview** -> pilih **Full**. Jangan **Flexible** (bisa menyebabkan redirect loop).
2. **SSL/TLS -> Edge Certificates** -> aktifkan **Always Use HTTPS**.
3. Biarkan record tunnel ber-proxy (awan oranye).

---

## 5. Buat Cloudflare Tunnel

Ada dua cara. Cara dashboard paling mudah dan otomatis menjadi service Windows.

### 5.1 Cara dashboard (disarankan)

1. Buka **Zero Trust** -> **Networks** -> **Tunnels** -> **Create a tunnel**. Saat pertama membuka Zero Trust, Cloudflare meminta nama tim; isi bebas.
2. Pilih **Cloudflared** -> beri nama, misalnya `cbt-rei` -> **Save tunnel**.
3. Pilih environment **Windows 64-bit**. Dashboard menampilkan perintah instalasi yang berisi token rahasia.
4. Unduh `cloudflared-windows-amd64.exe` dari halaman tersebut, rename menjadi `cloudflared.exe`.
5. Buka **PowerShell sebagai Administrator** di folder file tersebut, lalu jalankan perintah dari dashboard, bentuknya:

```powershell
.\cloudflared.exe service install eyJhIjoi...TOKEN_RAHASIA...
```

Token ini bersifat rahasia. Jangan screenshot, jangan commit, jangan kirim ke orang lain. Jika bocor, hapus tunnel dan buat baru.

6. Kembali ke halaman tunnel -> **Public Hostname** -> **Add a public hostname**:
   - **Subdomain**: `cbt` (atau kosongkan untuk domain utama)
   - **Domain**: pilih domain Anda
   - **Path**: kosongkan
   - **Service Type**: `HTTP`
   - **URL**: `127.0.0.1:3100`

Gunakan `127.0.0.1`, bukan `localhost`, agar cloudflared tidak mencoba IPv6 `::1` sementara Next.js mendengarkan IPv4.

7. Simpan. Status tunnel harus **Healthy**.
8. Buka `https://cbt.domainanda.com`.

### 5.2 Cara CLI (alternatif)

```powershell
winget install --id Cloudflare.cloudflared -e
cloudflared tunnel login
cloudflared tunnel create cbt-rei
cloudflared tunnel route dns cbt-rei cbt.domainanda.com
```

Buat `%USERPROFILE%\.cloudflared\config.yml`:

```yaml
tunnel: TUNNEL_UUID
credentials-file: C:\Users\NAMA_USER\.cloudflared\TUNNEL_UUID.json

ingress:
  - hostname: cbt.domainanda.com
    service: http://127.0.0.1:3100
  - service: http_status:404
```

Uji dulu di foreground:

```powershell
cloudflared tunnel run cbt-rei
```

Setelah berhasil, pasang sebagai service. Cara paling aman adalah memakai token agar service tidak bergantung pada file config milik user:

```powershell
cloudflared tunnel token cbt-rei
cloudflared service install TOKEN_YANG_DICETAK
```

Service Windows berjalan sebagai LocalSystem, sehingga file `config.yml` di folder user bisa tidak terbaca. Metode token menghindari masalah tersebut.

### 5.3 Uji cepat tanpa domain (opsional)

Untuk demo sementara:

```powershell
cloudflared tunnel --url http://127.0.0.1:3100
```

Cloudflare memberi URL acak `https://....trycloudflare.com`. URL berubah setiap kali dijalankan dan tidak untuk produksi.

---

## 6. Buat aplikasi otomatis hidup setelah reboot

Tunnel sudah menjadi service Windows. Next.js dan MySQL juga harus otomatis.

### 6.1 MySQL sebagai service

Pastikan MySQL tetap berjalan tanpa harus membuka Laragon. Jika Laragon tidak otomatis mendaftarkan MySQL sebagai service, daftarkan lewat menu Laragon (MySQL -> Service) atau Windows Services.

Cek di PowerShell:

```powershell
Get-Service | Where-Object { $_.Name -like "*mysql*" }
```

### 6.2 Next.js dengan NSSM (disarankan)

Unduh NSSM dari [nssm.cc](https://nssm.cc/download), letakkan `nssm.exe` di folder yang mudah diakses, lalu buka PowerShell sebagai Administrator:

```powershell
cd C:\laragon\www\hr_raja_emas\cbt_rei
mkdir logs -Force

nssm install CBT_REI "C:\Windows\System32\cmd.exe" "/c npm run start"
nssm set CBT_REI AppDirectory "C:\laragon\www\hr_raja_emas\cbt_rei"
nssm set CBT_REI AppStdout "C:\laragon\www\hr_raja_emas\cbt_rei\logs\server.log"
nssm set CBT_REI AppStderr "C:\laragon\www\hr_raja_emas\cbt_rei\logs\server-error.log"
nssm set CBT_REI AppRotateFiles 1
nssm set CBT_REI AppRotateOnline 1
nssm set CBT_REI AppRotateBytes 10485760
nssm set CBT_REI Start SERVICE_AUTO_START
nssm start CBT_REI
```

Perintah service:

```powershell
nssm restart CBT_REI
nssm stop CBT_REI
nssm status CBT_REI
```

### 6.3 Alternatif Task Scheduler

Jika tidak ingin memakai NSSM:

1. Buka **Task Scheduler** -> **Create Task**.
2. **General**: centang **Run whether user is logged on or not**, centang **Run with highest privileges**.
3. **Triggers**: **At startup**.
4. **Actions**: **Start a program**
   - Program: `C:\Windows\System32\cmd.exe`
   - Arguments: `/c cd /d "C:\laragon\www\hr_raja_emas\cbt_rei" && npm run start >> logs\server.log 2>&1`
   - Start in: `C:\laragon\www\hr_raja_emas\cbt_rei`
5. Simpan, lalu restart komputer untuk menguji.

### 6.4 Pengaturan daya

- Atur **Power & sleep** menjadi **Never** untuk sleep dan hibernate.
- Matikan fast startup bila perlu.
- Gunakan UPS bila ujian sedang berlangsung.
- Aktifkan opsi BIOS "restore power after AC loss" bila tersedia.

---

## 7. Amankan dan sesuaikan untuk HTTPS

Setelah `https://cbt.domainanda.com` berhasil dibuka:

1. Ubah `.env.local`:

```env
COOKIE_SECURE=true
```

2. Restart aplikasi:

```powershell
nssm restart CBT_REI
```

3. Hapus cookie lama di browser, lalu login admin lagi.

Penting:

- `COOKIE_SECURE=true` membuat cookie hanya dikirim lewat HTTPS. Jika admin membuka `http://192.168.x.x:3100` (LAN), login akan gagal/berulang. Untuk pemakaian campuran LAN HTTP dan domain HTTPS, pilih salah satu:
  - akses semua pengguna lewat domain HTTPS (disarankan), atau
  - biarkan `COOKIE_SECURE=false` selama masih butuh LAN HTTP.
- Jangan set `true` sebelum HTTPS benar-benar aktif.

### 7.1 Cloudflare Access untuk halaman admin (opsional, disarankan)

Aplikasi ini sudah punya login admin, tetapi Access menambah lapisan kedua.

1. **Zero Trust -> Access -> Applications -> Add an application -> Self-hosted**.
2. Buat aplikasi untuk domain `cbt.domainanda.com` dengan path yang ingin dilindungi, misalnya `/admin*`, `/login*`, `/kelola-soal*`, `/peserta*`, `/akun*`, `/koreksi*`, `/rekapitulasi*`, `/input-nilai*`, `/test-day6*`, `/jawaban-peserta*`, `/monitor*`.
3. Karena Access membatasi per hostname + path, buat aplikasi terpisah untuk setiap kelompok path yang tidak bisa digabung dengan wildcard. Ini menambah langkah login Cloudflare di depan login aplikasi.
4. Policy: izinkan email admin tertentu dengan OTP.
5. Jangan lindungi `/`, `/api/*`, dan `/uploads`, karena peserta harus bisa mengaksesnya tanpa login Cloudflare.

Jika Access terlalu merepotkan untuk alur harian, cukup andalkan login aplikasi dan lindungi akun admin dengan password kuat.

### 7.2 Catatan keamanan penting

- Password akun admin di database saat ini disimpan sebagai teks biasa. Untuk akses internet, ini berisiko jika database bocor. Sangat disarankan migrasi ke hash bcrypt sebelum dipakai publik.
- Jangan membuka port MySQL 3306 ke internet.
- Jangan melakukan port forwarding ke port 3100.
- Ganti semua password default akun admin.
- Batasi akses fisik ke komputer server.

### 7.3 Log aktivitas dan statistik database (superadmin)

Hanya role **superadmin** yang melihat menu berikut di sidebar dan dashboard:

- **Log Aktivitas** (`/aktivitas`): mencatat login, login gagal, logout, tambah/edit/hapus soal, generate token, perubahan akun, koreksi nilai, rekap, hapus jawaban, penilaian AADL/Day 6, impor peserta, dan backup. Setiap baris menyimpan waktu, nama/username, role, aksi, detail, IP, dan user agent. Bisa difilter berdasarkan kata kunci dan jenis aksi, serta dipaginasi 100 baris per halaman.
- **Database** (`/database`): menampilkan nama database, versi MySQL, charset/collation, jumlah tabel, total ukuran, jumlah baris pasti tabel penting, dan daftar 56 tabel beserta engine, estimasi baris, ukuran data/index, dan collation. Halaman ini hanya statistik, tidak menampilkan isi kolom sensitif.

Role `admin` dan `hr_staff` yang membuka URL tersebut akan diarahkan kembali ke dashboard dengan pesan akses ditolak.

IP yang tercatat mengikuti header `cf-connecting-ip` / `x-forwarded-for` / `x-real-ip`, sehingga di balik Cloudflare yang tampil adalah IP asli pengunjung.

---

## 8. Backup

Proyek ini sudah menyertakan skrip backup database otomatis. Hasil backup berupa satu file ZIP berisi file `.sql`, disimpan di `D:\backup-database`.

### 8.1 Skrip yang tersedia

| File | Fungsi |
| --- | --- |
| `scripts\backup-db.ps1` | Membaca `.env.local`, mencari `mysqldump` (Laragon/XAMPP/PATH), mengompres ke ZIP, menulis `backup.log`, mencatat aktivitas `backup`, dan menghapus ZIP lebih lama dari 90 hari. |
| `scripts\backup-db.bat` | Pembungkus untuk dipanggil Task Scheduler / klik dua kali. |
| `scripts\register-backup-task.ps1` | Mendaftarkan jadwal mingguan Sabtu 00:00 di Task Scheduler. |
| `scripts\setup-backup.cjs` | Dipanggil otomatis oleh `npm install` (postinstall) untuk mendaftarkan task backup. |

Nama file backup: `cbt_rei_yyyyMMdd_HHmmss.zip` (contoh `cbt_rei_20261107_000000.zip`).

### 8.2 Backup manual

```powershell
cd C:\laragon\www\hr_raja_emas\cbt_rei
.\scripts\backup-db.bat
```

Atau langsung PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-db.ps1
```

Cek hasilnya:

```powershell
Get-ChildItem D:\backup-database
Get-Content D:\backup-database\backup.log -Tail 20
```

### 8.3 Backup otomatis setiap Sabtu 00:00

Pendaftaran task juga dijalankan otomatis oleh `npm install` lewat `scripts/setup-backup.cjs`. Untuk mendaftarkan atau memperbarui secara manual, jalankan PowerShell **sebagai Administrator**:

```powershell
cd C:\laragon\www\hr_raja_emas\cbt_rei
powershell -ExecutionPolicy Bypass -File .\scripts\register-backup-task.ps1
```

Verifikasi:

```powershell
schtasks /Query /TN "CBT REI - Backup Database" /V /FO LIST
```

Jadwal: mingguan, Sabtu, 00:00. Jika komputer mati pada jam tersebut, jalankan backup manual setelah komputer menyala.

Penting: jika tugas dibuat tanpa hak Administrator, tugas berjalan dengan mode **Interactive only** (hanya saat user login). Agar tetap berjalan saat server terkunci/logout, daftarkan ulang dari PowerShell Administrator agar berjalan sebagai `SYSTEM`:

```powershell
$action  = New-ScheduledTaskAction -Execute "C:\laragon\www\hr_raja_emas\cbt_rei\scripts\backup-db.bat"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At 12:00AM
Register-ScheduledTask -TaskName "CBT REI - Backup Database" -Action $action -Trigger $trigger -User "SYSTEM" -RunLevel Highest -Force
```

Catatan: akun `SYSTEM` harus bisa membaca `.env.local` dan mengakses `D:\backup-database`. Jika gagal, gunakan akun Windows khusus server dengan hak akses folder tersebut.

### 8.4 Retensi dan pemantauan

- ZIP lebih tua dari 90 hari dihapus otomatis oleh skrip.
- Setiap backup tercatat di tabel `admin_activity_log` dan bisa dilihat superadmin di menu **Log Aktivitas**.
- Ringkasan ukuran database dan jumlah baris ada di menu **Database** (khusus superadmin).
- Tetap simpan salinan ZIP ke drive/cloud lain secara berkala. Backup di komputer yang sama tidak melindungi dari kerusakan disk atau ransomware.

### 8.5 Restore

```powershell
# hentikan aplikasi dulu agar tidak ada penulisan saat restore
Expand-Archive D:\backup-database\cbt_rei_20261107_000000.zip -DestinationPath D:\backup-database\restore -Force
& "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" -h 127.0.0.1 -u root db_cbt_rei -e "source D:/backup-database/restore/cbt_rei_20261107_000000.sql"
```

Uji restore di database percobaan sebelum benar-benar dibutuhkan.

---

## 9. Checklist uji setelah online

Lakukan berurutan:

1. `https://cbt.domainanda.com` terbuka tanpa peringatan sertifikat.
2. `http://` otomatis dialihkan ke `https://`.
3. Login admin berhasil dan tidak kembali ke halaman login.
4. Dashboard menampilkan data MySQL.
5. Kelola Soal: tambah soal dengan waktu, edit, dan hapus berhasil.
6. Halaman peserta: ketik nama/NIP, token, satu soal per layar, tombol Lanjut terkunci sampai dijawab.
7. Timer soal berjalan dan otomatis pindah soal.
8. Keluar halaman saat ujian memicu auto-submit; cek jawaban masuk di admin.
9. Gambar/upload tampil (folder `uploads` terbaca).
10. Cloudflare Tunnel berstatus **Healthy**.
11. Restart komputer, lalu ulangi langkah 1 tanpa membuka Laragon manual.
12. Rekap dan koreksi nilai tetap berjalan.

---

## 10. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Cloudflare error 1033 | Tunnel tidak terhubung | `Get-Service cloudflared`, start ulang service; cek dashboard tunnel |
| Cloudflare error 502 | Aplikasi Next.js mati atau port salah | `nssm status CBT_REI`, cek `logs\server-error.log`, pastikan port 3100 |
| Cloudflare error 521/522 | Origin tidak merespons | Pastikan tunnel jalan dan service `127.0.0.1:3100` benar |
| Domain belum aktif | Nameserver belum propagasi | Tunggu 1-24 jam, cek `nslookup -type=NS domainanda.com` |
| Redirect loop | SSL/TLS diset Flexible | Ubah ke **Full**, aktifkan Always Use HTTPS |
| Login admin berhasil lalu kembali ke login | `COOKIE_SECURE=true` tapi diakses via HTTP, atau `SESSION_SECRET` berubah | Akses via HTTPS; samakan secret; hapus cookie lama |
| Halaman admin menolak akses | Role akun tidak sesuai | Cek kolom `role` di tabel `admins` |
| Upload/gambar 404 | Folder `uploads` tidak ada atau working directory salah | Pastikan `AppDirectory` NSSM = folder proyek; restore folder uploads |
| MySQL error 1045 | User/password/host salah | Gunakan user `cbt_app@127.0.0.1`, cek `.env.local` |
| Port 3100 sudah dipakai | Proses lama masih hidup | `netstat -ano | findstr :3100`, lalu `taskkill /PID <PID> /F` |
| Perubahan `.env.local` tidak terbaca | Aplikasi belum restart | `nssm restart CBT_REI` |
| Perubahan kode tidak terbaca | Belum build ulang | `npm run build` lalu restart service |
| Email berhenti setelah pindah NS | Record MX/TXT tidak terbawa | Buat ulang MX, SPF, DKIM di Cloudflare |
| Upload besar gagal | Batas body request/Cloudflare | Kompres file; batas body Cloudflare Free 100 MB |

---

## 11. Alur update aplikasi

Saat ada perubahan kode:

```powershell
cd C:\laragon\www\hr_raja_emas\cbt_rei

# 1. backup dulu
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
& "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe" -h 127.0.0.1 -u cbt_app -p db_cbt_rei > "D:\backup\cbt_sebelum-update_$stamp.sql"

# 2. ambil kode baru (jika memakai Git)
git pull

# 3. install dependency dan build
npm ci
npm run build

# 4. restart
nssm restart CBT_REI
```

Untuk perubahan `.env.local` saja, cukup restart service tanpa build.

---

## 12. Pertanyaan yang sering muncul

**Apakah harus beli hosting Hostinger?**
Tidak. Yang dibutuhkan hanya domain. Hosting shared Hostinger tidak bisa menjalankan Next.js (butuh Node.js). Jika nanti tidak ingin bergantung pada PC lokal, gunakan VPS Hostinger, bukan shared hosting.

**Apakah Cloudflare Tunnel gratis?**
Ya, tunnel gratis. Yang berbayar adalah domain (tahunan). Cloudflare Access gratis sampai batas pengguna tertentu.

**Apakah IP publik statis diperlukan?**
Tidak. Tunnel membuat koneksi keluar.

**Apakah Laragon harus terbuka?**
MySQL harus berjalan. Paling aman daftarkan MySQL sebagai Windows service dan Next.js lewat NSSM, sehingga tidak perlu login Windows untuk menyalakan server.

**Berapa lama domain aktif di Cloudflare?**
Biasanya di bawah 1 jam, maksimal 24 jam setelah nameserver diubah.

**Apakah peserta di luar jaringan bisa mengakses?**
Ya, lewat domain HTTPS. Tidak perlu satu jaringan dengan server.

**Bagaimana jika internet server putus saat ujian?**
Peserta kehilangan akses. Gunakan koneksi cadangan (tethering/router kedua) dan UPS. Ini konsekuensi hosting di komputer lokal.

**Apakah auto-submit tetap bekerja lewat Cloudflare?**
Ya, karena `sendBeacon` mengirim ke origin yang sama lewat HTTPS. Sudah diuji di lokal; uji ulang setelah online.

---

## 13. Perintah ringkas

```powershell
# aplikasi
cd C:\laragon\www\hr_raja_emas\cbt_rei
npm ci
npm run build
npm run start          # foreground, untuk uji
nssm restart CBT_REI   # jika memakai service

# tunnel
Get-Service cloudflared
Restart-Service cloudflared
cloudflared tunnel list

# mysql
& "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" -uroot -e "SHOW DATABASES;"

# cek port
netstat -ano | findstr :3100
```

---

Dokumen ini mengikuti kondisi proyek saat ini: Next.js 16, Node 24, MySQL 8.4 Laragon, port 3100, folder upload `uploads/` di root proyek, dan session memakai `SESSION_SECRET` + `COOKIE_SECURE`.
