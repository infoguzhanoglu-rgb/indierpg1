@echo off
setlocal enabledelayedexpansion
color 0b

echo ====================================================
echo    MMORPG NETWORKING STACK PRO v2.0
echo ====================================================

:: Sunucu Port Kontrolü
set PORT=3000
echo [+] Network Configuration: Port !PORT! [BINARY MODE]
echo [+] AOI System: Active (35 meters)
echo [+] Protocol: Snapshot Interpolation (150ms delay)
echo ====================================================
echo.

:: NPM Bağımlılık Kontrolü (concurrently var mı?)
where concurrently >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] 'concurrently' bulunamadi. Yukleniyor...
    npm install -g concurrently
)

echo [RUNNING] Sunucu ve Istemci baslatiliyor...
echo.

:: npx concurrently ile başlat
:: -n: Isimlendirme
:: -c: Renklendirme
:: --kill-others: Biri kapanirsa digerini de kapat
npx concurrently --kill-others ^
  -n "NETWORK_SRV,VITE_CLIENT" ^
  -c "bgGreen.bold,bgCyan.bold" ^
  "cd server && npm run dev" ^
  "cd client && npm run dev"

pause
