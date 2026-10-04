# Unused by the scheduled task: SYSTEM PowerShell hangs on this host.
# BnPDrive runs node.exe directly. See scripts/ensure-production.cmd.

# Long-running production server for scheduled task BnPDrive.
# Logs to data/next-start.log so a hung boot can be diagnosed.

$ErrorActionPreference = 'Continue'
$bootLog = 'C:\Windows\Temp\bnp-start.log'
Add-Content -Path $bootLog -Value ('{0} wrapper entered' -f (Get-Date -Format o))

$root = 'L:\BnPDrive'
Set-Location $root
Add-Content -Path $bootLog -Value ('{0} cwd {1}' -f (Get-Date -Format o), (Get-Location))

$env:NEXT_TELEMETRY_DISABLED = '1'
$env:NODE_ENV = 'production'

$logDir = Join-Path $root 'data'
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

$outLog = Join-Path $logDir 'next-start.log'
if ((Test-Path $outLog) -and ((Get-Item $outLog).Length -gt 1MB)) {
  Move-Item -Path $outLog -Destination ($outLog + '.old') -Force
}

$node = 'C:\Program Files\nodejs\node.exe'
$nextJs = Join-Path $root 'node_modules\next\dist\bin\next'
$stamp = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'
Add-Content -Path $outLog -Value "$stamp starting next start -p 3100"

& $node $nextJs start -p 3100 *>> $outLog
exit $LASTEXITCODE
