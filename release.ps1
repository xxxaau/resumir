param(
    [ValidateSet("all", "firefox", "chromium")]
    [string]$Target = "all",
    [switch]$NoBackup = $false,
    [switch]$SkipDevRestore = $false
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$backupScript = Join-Path $root "scripts\backup-extension-data.mjs"
$devModeScript = Join-Path $root "set_dev_mode.ps1"
$buildScript = Join-Path $root "build.ps1"

Write-Host "
Release build starting..." -ForegroundColor Cyan

if (-not $NoBackup) {
    Write-Host "
[1/4] Backing up DEV data..." -ForegroundColor Yellow
    try {
        & node $backupScript firefox dev 2>&1 | Out-Null
        & node $backupScript chromium dev 2>&1 | Out-Null
        Write-Host "  OK: DEV data backed up" -ForegroundColor Green
    }
    catch {
        Write-Warning "  WARNING: Backup failed but continuing"
    }
}

Write-Host "
[2/4] Switching to PROD mode..." -ForegroundColor Yellow
& $devModeScript prod

Write-Host "
[3/4] Building extension ($Target)..." -ForegroundColor Yellow
& $buildScript -Target $Target

if (-not $SkipDevRestore) {
    Write-Host "
[4/4] Restoring DEV mode..." -ForegroundColor Yellow
    & $devModeScript dev
}

Write-Host "
Release build completed!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Cyan

$zips = Get-ChildItem -Filter "resumir-contingut-v*.zip" -ErrorAction SilentlyContinue
if ($zips) {
    Write-Host "
Generated files:" -ForegroundColor Cyan
    $zips | ForEach-Object { Write-Host "  - $($_.Name)" }
}

Write-Host ""
