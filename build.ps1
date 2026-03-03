<#
.SYNOPSIS
    Multi-target build script for the extension.
.DESCRIPTION
    Generates separate ZIP packages for Firefox and Chromium.
    For Chromium: copies manifest.chromium.json as manifest.json,
    concatenates ext.js + background.js into background.bundle.js.
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

# Read version from manifest.json
$manifest = Get-Content "manifest.json" -Raw | ConvertFrom-Json
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
        [string]$ManifestFile,
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

    # Copy manifest
    Copy-Item $ManifestFile "$buildDir\manifest.json"

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

    # Create ZIP using Python to ensure forward slash '/' separators
    # (AMO rejects ZIPs with Windows backslash '\' path separators)
    Push-Location -Path $buildDir
    try {
        $pyScript = @"
import os, zipfile
with zipfile.ZipFile(r'..\$zipName', 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('.'):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, '.').replace('\\', '/')
            zf.write(file_path, arcname)
"@
        Set-Content -Path "make_zip_temp.py" -Value $pyScript
        python make_zip_temp.py
        Remove-Item "make_zip_temp.py" -Force
    }
    finally {
        Pop-Location
    }
    
    # Clean up
    Remove-Item $buildDir -Recurse -Force

    $size = (Get-Item $zipName).Length / 1KB
    Write-Host "  Created $zipName ($([math]::Round($size, 1)) KB)" -ForegroundColor Green
}

# --- Firefox Build ---
if ($Target -eq "firefox" -or $Target -eq "all") {
    Write-Host "`nBuilding Firefox package..." -ForegroundColor Blue
    
    New-BuildZip -TargetName "firefox" `
        -ManifestFile "manifest.json" `
        -ExtraFiles @("ext.js", "background.js") `
        -ExcludeFiles @()
}

# --- Chromium Build ---
if ($Target -eq "chromium" -or $Target -eq "all") {
    Write-Host "`nBuilding Chromium package..." -ForegroundColor Blue

    # Generate background.bundle.js (concatenate ext.js + background.js)
    $header = @"
// background.bundle.js - Auto-generated for Chromium service worker
// DO NOT EDIT - edit ext.js and background.js instead

"@
    $extContent = Get-Content "ext.js" -Raw
    $bgContent = Get-Content "background.js" -Raw
    $bundleContent = $header + $extContent + "`r`n`r`n// --- background.js ---`r`n`r`n" + $bgContent
    
    Set-Content "background.bundle.js" $bundleContent -NoNewline

    Write-Host "  Generated background.bundle.js" -ForegroundColor DarkGray

    New-BuildZip -TargetName "chromium" `
        -ManifestFile "manifest.chromium.json" `
        -ExtraFiles @("background.bundle.js", "ext.js") `
        -ExcludeFiles @()
}

Write-Host "`nBuild complete!" -ForegroundColor Green
