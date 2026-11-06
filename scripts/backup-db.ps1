param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$BackupDir = "C:\backupdata-cbt_rei",
  [int]$RetentionDays = 90
)

if ($env:CBT_BACKUP_DIR) { $BackupDir = $env:CBT_BACKUP_DIR }

$ErrorActionPreference = "Stop"
$logFile = Join-Path $BackupDir "backup.log"

function Write-Log {
  param([string]$Message)
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  try { Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8 } catch {}
  Write-Host $line
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

try {
  $ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
  $envFile = Join-Path $ProjectRoot ".env.local"
  if (-not (Test-Path -LiteralPath $envFile)) { throw ".env.local tidak ditemukan di $ProjectRoot. Salin .env.example menjadi .env.local lalu isi kredensial database." }

  $config = @{}
  foreach ($line in Get-Content -LiteralPath $envFile) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      $value = $matches[2].Trim()
      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      $config[$matches[1]] = $value
    }
  }

  $dbHost = if ($config['DB_HOST']) { $config['DB_HOST'] } else { '127.0.0.1' }
  $dbPort = if ($config['DB_PORT']) { $config['DB_PORT'] } else { '3306' }
  $dbUser = if ($config['DB_USER']) { $config['DB_USER'] } else { 'root' }
  $dbPass = if ($config.ContainsKey('DB_PASSWORD')) { $config['DB_PASSWORD'] } else { '' }
  $dbName = if ($config['DB_NAME']) { $config['DB_NAME'] } else { 'db_cbt_rei' }

  $mysqldump = $null
  $laragonRoot = "C:\laragon\bin\mysql"
  if (Test-Path -LiteralPath $laragonRoot) {
    $found = Get-ChildItem -LiteralPath $laragonRoot -Directory -ErrorAction SilentlyContinue |
      Sort-Object Name -Descending |
      ForEach-Object { Join-Path $_.FullName "bin\mysqldump.exe" } |
      Where-Object { Test-Path -LiteralPath $_ } |
      Select-Object -First 1
    if ($found) { $mysqldump = $found }
  }
  if (-not $mysqldump) {
    $command = Get-Command mysqldump.exe -ErrorAction SilentlyContinue
    if ($command) { $mysqldump = $command.Source }
  }
  if (-not $mysqldump) {
    $common = @(
      "C:\xampp\mysql\bin\mysqldump.exe",
      "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe",
      "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
    )
    foreach ($candidate in $common) {
      if (Test-Path -LiteralPath $candidate) { $mysqldump = $candidate; break }
    }
  }
  if (-not $mysqldump) { throw "mysqldump.exe tidak ditemukan. Install MySQL/MariaDB atau tambahkan folder bin-nya ke PATH." }
  $mysql = Join-Path (Split-Path $mysqldump) "mysql.exe"
  if (-not (Test-Path -LiteralPath $mysql)) { $mysql = $null }

  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $zipFile = Join-Path $BackupDir "cbt_rei_$stamp.zip"
  $tempDir = Join-Path $env:TEMP "cbt_backup_$stamp"
  New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
  $sqlFile = Join-Path $tempDir "cbt_rei_$stamp.sql"

  Write-Log "Mulai backup database $dbName ke $zipFile"
  $env:MYSQL_PWD = $dbPass
  try {
    $dumpArgs = @(
      "--host=$dbHost",
      "--port=$dbPort",
      "--user=$dbUser",
      "--protocol=TCP",
      "--single-transaction",
      "--quick",
      "--routines",
      "--triggers",
      "--no-tablespaces",
      "--default-character-set=utf8mb4",
      "--result-file=$sqlFile",
      $dbName
    )
    & $mysqldump @dumpArgs
    if ($LASTEXITCODE -ne 0) { throw "mysqldump gagal dengan kode $LASTEXITCODE." }
    if (-not (Test-Path -LiteralPath $sqlFile) -or (Get-Item -LiteralPath $sqlFile).Length -eq 0) { throw "File dump kosong." }

    Compress-Archive -LiteralPath $sqlFile -DestinationPath $zipFile -CompressionLevel Optimal -Force
    $size = [math]::Round((Get-Item -LiteralPath $zipFile).Length / 1MB, 2)
    Write-Log "Backup berhasil: $zipFile ($size MB)"
  } finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
  }

  try {
    if (-not $mysql) { throw "mysql.exe tidak ditemukan di folder yang sama dengan mysqldump.exe." }
    $safeName = (Split-Path $zipFile -Leaf).Replace("'", "''")
    $sql = "INSERT INTO admin_activity_log (username,nama,role,action,entity,detail,ip_address,user_agent,created_at) VALUES ('system','Backup Otomatis','system','backup','database','$safeName','127.0.0.1','backup-db.ps1',NOW())"
    $env:MYSQL_PWD = $dbPass
    & $mysql "--host=$dbHost" "--port=$dbPort" "--user=$dbUser" "--protocol=TCP" -e $sql $dbName | Out-Null
  } catch {
    Write-Log "Backup sukses, tetapi gagal menulis log aktivitas: $($_.Exception.Message)"
  } finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
  }

  $old = Get-ChildItem -LiteralPath $BackupDir -Filter "cbt_rei_*.zip" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) }
  foreach ($file in $old) {
    Remove-Item -LiteralPath $file.FullName -Force
    Write-Log "Hapus backup lama: $($file.Name)"
  }

  exit 0
} catch {
  Write-Log "BACKUP GAGAL: $($_.Exception.Message)"
  exit 1
}
