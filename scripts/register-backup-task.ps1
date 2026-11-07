param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$BackupDir = "D:\backup-database"
)

$ErrorActionPreference = "Stop"

if ($env:CBT_BACKUP_DIR) { $BackupDir = $env:CBT_BACKUP_DIR }
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$scriptPath = Join-Path $PSScriptRoot "backup-db.ps1"
if (-not (Test-Path -LiteralPath $scriptPath)) { throw "Script backup tidak ditemukan: $scriptPath" }

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$taskName = "CBT REI - Backup Database"
$description = "Backup mingguan database CBT REI setiap Sabtu 00:00 ke $BackupDir"
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -ProjectRoot `"$ProjectRoot`" -BackupDir `"$BackupDir`""

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At "00:00"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

$mode = "USER"
if (Test-Administrator) {
  try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User "SYSTEM" -RunLevel Highest -Description $description -Force | Out-Null
    $mode = "SYSTEM"
  } catch {
    Write-Output "Gagal membuat task SYSTEM: $($_.Exception.Message)"
  }
}

if ($mode -ne "SYSTEM") {
  try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User $env:USERNAME -Description $description -Force | Out-Null
    $mode = "USER"
  } catch {
    # Fallback terakhir: schtasks tanpa hak Administrator.
    $taskCommand = "powershell.exe $arguments"
    & schtasks.exe /Create /TN $taskName /SC WEEKLY /D SAT /ST 00:00 /TR $taskCommand /F | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Gagal mendaftarkan scheduled task (kode $LASTEXITCODE). Jalankan PowerShell sebagai Administrator lalu ulangi." }
    $mode = "USER"
  }
}

Write-Output "MODE=$mode"
if ($mode -eq "USER") {
  Write-Output "Catatan: task berjalan saat user Windows login. Untuk server 24/7, jalankan script ini dari PowerShell Administrator agar berjalan sebagai SYSTEM."
}

Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
Get-ScheduledTaskInfo -TaskName $taskName | Select-Object NextRunTime, LastRunTime, LastTaskResult
