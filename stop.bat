@echo off
setlocal
cd /d "%~dp0"

echo ===============================================
echo  Shutting down Dispatch dev environment
echo ===============================================

echo.
echo Closing web console window...
taskkill /FI "WINDOWTITLE eq DispatchWeb*" /T /F >nul 2>&1

echo Closing mobile (Expo) window...
taskkill /FI "WINDOWTITLE eq DispatchMobile*" /T /F >nul 2>&1

echo.
echo Removing adb reverse tunnels (if a device is connected)...
adb get-state >nul 2>&1
if not errorlevel 1 (
    adb reverse --remove-all >nul 2>&1
)

echo.
echo Stopping Supabase (Postgres, Auth, Realtime, Storage, Mailpit)...
call npx supabase stop

echo.
echo ===============================================
echo  Everything stopped. Docker Desktop itself was left
echo  running - close it manually from the tray if you
echo  want to free up all resources.
echo ===============================================
echo.
pause
