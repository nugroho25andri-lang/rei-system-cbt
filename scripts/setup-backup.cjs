const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const strict = process.argv.includes("--strict");
const root = path.resolve(__dirname, "..");

function done(code) {
  process.exit(strict ? code : 0);
}

if (process.platform !== "win32") {
  console.log("[backup] Backup otomatis hanya dikonfigurasi di Windows. Lewati pendaftaran task.");
  done(0);
}

const registerScript = path.join(__dirname, "register-backup-task.ps1");
if (!fs.existsSync(registerScript)) {
  console.warn("[backup] scripts/register-backup-task.ps1 tidak ditemukan.");
  done(1);
}

console.log("[backup] Mendaftarkan backup otomatis database setiap Sabtu 00:00...");
const result = spawnSync(
  "powershell.exe",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", registerScript],
  { cwd: root, stdio: "inherit" },
);

if (!fs.existsSync(path.join(root, ".env.local"))) {
  console.warn("[backup] .env.local belum ada. Salin .env.example menjadi .env.local lalu isi kredensial MySQL.");
  console.warn("[backup] Backup akan berjalan otomatis setelah file tersebut tersedia.");
}

if (result.error) {
  console.warn(`[backup] Gagal menjalankan PowerShell: ${result.error.message}`);
  done(1);
}

if (result.status !== 0) {
  console.warn("[backup] Pendaftaran task gagal. Jalankan PowerShell sebagai Administrator lalu ulangi: npm run setup:backup");
  done(1);
}

console.log("[backup] Selesai. Cek dengan: schtasks /Query /TN \"CBT REI - Backup Database\" /V /FO LIST");
done(0);
