param (
    [ValidateSet("dev", "prod")]
    [string]$Mode = "dev"
)

$ErrorActionPreference = "Stop"

$root        = $PSScriptRoot
$basePath    = Join-Path $root "manifest.base.json"
$ffPatchPath = Join-Path $root "manifest.firefox.patch.json"
$iconsDir    = Join-Path $root "icons"
$imgSrcDir   = Join-Path $root "img\$Mode"

if (-not (Test-Path $imgSrcDir)) {
    Write-Error "No s'ha trobat '$imgSrcDir'."
    exit 1
}

$base    = Get-Content $basePath    -Raw | ConvertFrom-Json
$ffPatch = Get-Content $ffPatchPath -Raw | ConvertFrom-Json

if ($Mode -eq "dev") {
    Write-Host "Canviant a mode DESENVOLUPAMENT..." -ForegroundColor DarkYellow
    $base.name = "Resumir contingut (DEV)"
    $ffPatch.browser_specific_settings.gecko.id = "sergi.dev@xaudiera.xyz"
}
elseif ($Mode -eq "prod") {
    Write-Host "Canviant a mode PRODUCCIO..." -ForegroundColor Cyan
    $base.name = "Resumir contingut"
    $ffPatch.browser_specific_settings.gecko.id = "sergi@xaudiera.xyz"
}

$base    | ConvertTo-Json -Depth 10 | Set-Content $basePath    -Encoding UTF8
$ffPatch | ConvertTo-Json -Depth 10 | Set-Content $ffPatchPath -Encoding UTF8
Write-Host "  Fitxers base i patch actualitzats." -ForegroundColor DarkGray

# Regenerate manifest.json and manifest.chromium.json from base + patches
node (Join-Path $root "scripts/merge-manifest.mjs") firefox  (Join-Path $root "manifest.json")
node (Join-Path $root "scripts/merge-manifest.mjs") chromium (Join-Path $root "manifest.chromium.json")
Write-Host "  Manifests regenerats." -ForegroundColor DarkGray

$sizes = @(16, 32, 48, 64, 96, 128)
foreach ($sz in $sizes) {
    $src = Join-Path $imgSrcDir "icon-$sz.png"
    $dst = Join-Path $iconsDir  "icon-$sz.png"
    Copy-Item $src $dst -Force
}
Write-Host "  Icones copiades des de img/$Mode/." -ForegroundColor DarkGray
Write-Host "Fet! Mode: $($Mode.ToUpper())" -ForegroundColor Green
