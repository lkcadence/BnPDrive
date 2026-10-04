@echo off
setlocal EnableExtensions
rem Watchdog: restart BnPDrive when http://127.0.0.1:3100 is not HTTP 200.
rem Runs as SYSTEM. Avoid PowerShell — SYSTEM powershell hangs on this host.
rem Wait and retry before killing so a just-started next can bind and warm up.

set "LOG=L:\BnPDrive\data\ensure-production.log"
set "CODEFILE=%TEMP%\bnp-health-code.txt"
if not exist "L:\BnPDrive\data" mkdir "L:\BnPDrive\data"

call :health 45
if "%CODE%"=="200" (
  echo %DATE% %TIME% healthy>> "%LOG%"
  exit /b 0
)

echo %DATE% %TIME% not ready code=%CODE%; wait 30s>> "%LOG%"
timeout /t 30 /nobreak >NUL
call :health 45
if "%CODE%"=="200" (
  echo %DATE% %TIME% healthy after wait>> "%LOG%"
  exit /b 0
)

echo %DATE% %TIME% unhealthy code=%CODE%; restarting BnPDrive>> "%LOG%"
schtasks.exe /End /TN BnPDrive >NUL 2>&1
timeout /t 2 /nobreak >NUL
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /C:":3100 " ^| findstr LISTENING') do (
  echo %DATE% %TIME% taskkill listener %%P>> "%LOG%"
  taskkill /F /PID %%P /T >NUL 2>&1
)
timeout /t 3 /nobreak >NUL
schtasks.exe /Run /TN BnPDrive >NUL 2>&1
echo %DATE% %TIME% BnPDrive started; waiting for HTTP 200>> "%LOG%"
timeout /t 15 /nobreak >NUL
call :health 60
if "%CODE%"=="200" (
  echo %DATE% %TIME% healthy after restart>> "%LOG%"
  exit /b 0
)
echo %DATE% %TIME% still unhealthy code=%CODE%>> "%LOG%"
exit /b 1

:health
curl.exe -sS --connect-timeout 5 -m %1 -o NUL -w "%%{http_code}" http://127.0.0.1:3100/ > "%CODEFILE%" 2>NUL
set /p CODE=<"%CODEFILE%"
goto :eof
