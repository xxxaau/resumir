<#
.SYNOPSIS
    Multi-target build script for the extension.
.DESCRIPTION
    Generates separate ZIP packages for Firefox and Chromium.
    Manifests are generated from manifest.base.json + manifest.<target>.patch.json.
    For Chromium: bundles ext.js + background.js into background.bundle.js via esbuild.
.PARAMETER Target
    Build target: firefox, chromium, or all (default: all)
.EXAMPLE
    .\build.ps1
    .\build.ps1 -Target firefox
    .\build.ps1 -Target chromium
#>

param(
    [ValidateSet("firefox", "chromium", "all")]
    [string]$Target = "all"
)

$ErrorActionPreference = "Stop"

# Read version from manifest.base.json (source of truth)
$manifest = Get-Content "manifest.base.json" -Raw | ConvertFrom-Json
$version = $manifest.version

Write-Host "Building v$version for target: $Target" -ForegroundColor Cyan

# Common files and directories
$commonFiles = @(
    "Readability.js",
    "theme.js",
    "LICENSE",
    "PRIVACY_POLICY.md"
)

$commonDirs = @(
    "icons",
    "options",
    "shared",
    "sidebar"
)

function New-BuildZip {
    param(
        [string]$TargetName,
        [string]$ManifestTarget,
        [string[]]$ExtraFiles,
        [string[]]$ExcludeFiles
    )

    $zipName = "resumir-contingut-v$version-$TargetName.zip"

    if (Test-Path $zipName) {
        Remove-Item $zipName -Force
        Write-Host "  Removed old $zipName" -ForegroundColor DarkGray
    }

    # Create temp build dir
    $buildDir = "build_$TargetName"
    if (Test-Path $buildDir) { Remove-Item $buildDir -Recurse -Force }
    New-Item -ItemType Directory -Path $buildDir | Out-Null

    # Generate manifest from base + patch
    node scripts/merge-manifest.mjs $ManifestTarget "$buildDir/manifest.json"
    Write-Host "  Generated manifest.json (from $ManifestTarget patch)" -ForegroundColor DarkGray

    # Copy common files
    foreach ($file in $commonFiles) {
        if (Test-Path $file) {
            Copy-Item $file "$buildDir\$file"
        }
        else {
            Write-Host "  WARNING: $file not found!" -ForegroundColor Yellow
        }
    }

    # Copy extra files (browser-specific)
    foreach ($file in $ExtraFiles) {
        if (Test-Path $file) {
            Copy-Item $file "$buildDir\$file"
        }
        else {
            Write-Host "  WARNING: $file not found!" -ForegroundColor Yellow
        }
    }

    # Copy directories
    foreach ($dir in $commonDirs) {
        if (Test-Path $dir) {
            Copy-Item $dir "$buildDir\$dir" -Recurse
        }
        else {
            Write-Host "  WARNING: $dir/ not found!" -ForegroundColor Yellow
        }
    }

    # Remove excluded files from build dir
    foreach ($file in $ExcludeFiles) {
        $excludePath = Join-Path $buildDir $file
        if (Test-Path $excludePath) {
            Remove-Item $excludePath -Force
        }
    }

    # Create ZIP via Node.js (ensures '/' separators, AMO-compliant, no Python needed)
    node scripts/make-zip.mjs $buildDir $zipName

    # Clean up
    Remove-Item $buildDir -Recurse -Force
}

# --- Firefox Build ---
if ($Target -eq "firefox" -or $Target -eq "all") {
    Write-Host "`nBuilding Firefox package..." -ForegroundColor Blue

    New-BuildZip -TargetName "firefox" `
        -ManifestTarget "firefox" `
        -ExtraFiles @("ext.js", "background.js") `
        -ExcludeFiles @()
}

# --- Chromium Build ---
if ($Target -eq "chromium" -or $Target -eq "all") {
    Write-Host "`nBuilding Chromium package..." -ForegroundColor Blue

    # Generate background.bundle.js via esbuild
    node scripts/build-chromium-bundle.mjs
    Write-Host "  Generated background.bundle.js (via esbuild)" -ForegroundColor DarkGray

    New-BuildZip -TargetName "chromium" `
        -ManifestTarget "chromium" `
        -ExtraFiles @("background.bundle.js", "ext.js") `
        -ExcludeFiles @()
}

Write-Host "`nBuild complete!" -ForegroundColor Green
