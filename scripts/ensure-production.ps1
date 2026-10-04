# Watchdog for https://bobnpamdrive.com origin on localhost:3100.
# If the homepage is not HTTP 200, restart scheduled task BnPDrive.
# Run as SYSTEM so hung next start processes can be killed.

$ErrorActionPreference = 'Continue'
$root = 'L:\BnPDrive'
$logDir = Join-Path $root 'data'
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

$log = Join-Path $logDir 'ensure-production.log'

function Write-WatchLog {
  param([string]$Message)
  $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'), $Message
  Add-Content -Path $log -Value $line
  if ((Test-Path $log) -and ((Get-Item $log).Length -gt 1MB)) {
    $keep = Get-Content $log -Tail 200
    Set-Content -Path $log -Value $keep
  }
}

function Test-OriginHealthy {
  param([int]$TimeoutSec)
  $code = curl.exe -sS --connect-timeout 5 -m $TimeoutSec -o NUL -w '%{http_code}' http://127.0.0.1:3100/ 2>$null
  return $code -eq '200'
}

function Get-NextStartPids {
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object {
      $_.CommandLine -like '*next start*' -and $_.CommandLine -like '*3100*'
    } |
    Select-Object -ExpandProperty ProcessId
}

function Stop-OriginListener {
  schtasks.exe /End /TN BnPDrive 2>$null | Out-Null
  Start-Sleep -Seconds 2
  foreach ($procId in @(Get-NextStartPids)) {
    Write-WatchLog "taskkill pid $procId"
    cmd.exe /c "taskkill /F /PID $procId /T" | Out-Null
  }
  for ($i = 0; $i -lt 10; $i++) {
    $listen = cmd.exe /c 'netstat -ano' | Select-String -Pattern ':3100\s.+\sLISTENING'
    if (-not $listen) {
      return
    }
    Start-Sleep -Seconds 1
  }
}

if (Test-OriginHealthy -TimeoutSec 20) {
  Write-WatchLog 'healthy'
  exit 0
}

Write-WatchLog 'unhealthy; restarting BnPDrive'
Stop-OriginListener
Start-Sleep -Seconds 2
Start-ScheduledTask -TaskName BnPDrive
Write-WatchLog 'BnPDrive started; waiting for HTTP 200'

if (Test-OriginHealthy -TimeoutSec 60) {
  Write-WatchLog 'healthy after restart'
  exit 0
}

Write-WatchLog 'still unhealthy after restart'
exit 1
