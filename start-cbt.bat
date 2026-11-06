@echo off
title CBT Raja Emas Indonesia
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js tidak ditemukan. Install Node.js 20+ terlebih dahulu.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Memasang dependency...
  call npm install
)

if not exist ".next\BUILD_ID" (
  echo Build aplikasi...
  call npm run build
  if errorlevel 1 (
    echo Build gagal.
    pause
    exit /b 1
  )
)

echo.
echo CBT berjalan di:
echo   http://localhost:3100
echo   http://IP-KOMPUTER-INI:3100  ^(akses dari jaringan kantor^)
echo.
echo Pastikan MySQL Laragon sudah Start.
echo Tekan Ctrl+C untuk menghentikan server.
echo.

call npm run start
pause
