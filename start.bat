@echo off
setlocal
cd /d "%~dp0"

echo ===============================================
echo  Starting Dispatch dev environment
echo ===============================================

echo.
echo [1/4] Checking Docker...
docker info >nul 2>&1
if not errorlevel 1 goto dockerready

echo Docker is not running. Trying to start Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo Waiting for Docker to come up, this can take a minute...

:waitdocker
timeout /t 5 >nul
docker info >nul 2>&1
if errorlevel 1 goto waitdocker
echo Docker is up.

:dockerready

echo.
echo [2/4] Starting Supabase (Postgres, Auth, Realtime, Storage, Mailpit)...
call npx supabase start
if errorlevel 1 (
    echo Supabase failed to start. Check the output above.
    pause
    exit /b 1
)

echo.
echo [3/4] Starting web console (Next.js) on http://localhost:3000 ...
start "DispatchWeb" cmd /k "cd /d "%~dp0web" && npm run dev"

echo.
echo [4/4] Starting mobile app (Expo) ...
start "DispatchMobile" cmd /k "cd /d "%~dp0" && npm start"

echo.
echo Setting up adb reverse tunnels (if a device is connected)...
adb get-state >nul 2>&1
if not errorlevel 1 (
    adb reverse tcp:8090 tcp:8090 >nul 2>&1
    adb reverse tcp:54321 tcp:54321 >nul 2>&1
    echo adb reverse tunnels set for ports 8090 and 54321.
) else (
    echo No adb device detected - skipping adb reverse ^(plug in the phone and run:
    echo   adb reverse tcp:8090 tcp:8090 ^&^& adb reverse tcp:54321 tcp:54321^)
)

echo.
echo ===============================================
echo  Everything is starting up. URLs:
echo    Web console:   http://localhost:3000
echo    Supabase API:  http://127.0.0.1:54321
echo    Supabase Studio: http://127.0.0.1:54323
echo    Mailpit (fake email): http://127.0.0.1:54324
echo    Mobile: check the "DispatchMobile" window for the QR code
echo ===============================================
echo.
pause
