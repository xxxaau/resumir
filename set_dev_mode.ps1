param (
    [ValidateSet("dev", "prod")]
    [string]$Mode = "dev"
)

$ErrorActionPreference = "Stop"

$root        = $PSScriptRoot
$basePath    = Join-Path $root "manifest.base.json"
$ffPatchPath = Join-Path $root "manifest.firefox.patch.json"
$ffProdPatchPath = Join-Path $root "manifest.firefox.prod.patch.json"
$chromiumPatchPath = Join-Path $root "manifest.chromium.patch.json"
$chromiumProdPatchPath = Join-Path $root "manifest.chromium.prod.patch.json"
$iconsDir    = Join-Path $root "icons"
$imgSrcDir   = Join-Path $root "img\$Mode"

if (-not (Test-Path $imgSrcDir)) {
    Write-Error "No s'ha trobat '$imgSrcDir'."
    exit 1
}

$base = Get-Content $basePath -Raw | ConvertFrom-Json

if ($Mode -eq "dev") {
    Write-Host "Canviant a mode DESENVOLUPAMENT..." -ForegroundColor DarkYellow
    $base.name = "Resumir contingut (DEV)"
    
    # Use DEV patches
    $ffPatch = Get-Content $ffPatchPath -Raw | ConvertFrom-Json
    $ffPatch.browser_specific_settings.gecko.id = "sergi.dev@xaudiera.xyz"
    $ffPatch | ConvertTo-Json -Depth 10 | Set-Content $ffPatchPath -Encoding UTF8
    
    $chromiumPatch = Get-Content $chromiumPatchPath -Raw | ConvertFrom-Json
    $chromiumPatch | ConvertTo-Json -Depth 10 | Set-Content $chromiumPatchPath -Encoding UTF8
    
    node (Join-Path $root "scripts/merge-manifest.mjs") firefox  (Join-Path $root "manifest.json")
    node (Join-Path $root "scripts/merge-manifest.mjs") chromium (Join-Path $root "manifest.chromium.json")
}
elseif ($Mode -eq "prod") {
    Write-Host "Canviant a mode PRODUCCIO..." -ForegroundColor Cyan
    $base.name = "Resumir contingut"
    
    # Use PROD patches if they exist, otherwise fallback to regular patches
    if (Test-Path $ffProdPatchPath) {
        Copy-Item $ffProdPatchPath $ffPatchPath -Force
        Write-Host "  Utilizant parche Firefox de PRODUCCION" -ForegroundColor DarkGray
    } else {
        $ffPatch = Get-Content $ffPatchPath -Raw | ConvertFrom-Json
        $ffPatch.browser_specific_settings.gecko.id = "sergi@xaudiera.xyz"
        $ffPatch | ConvertTo-Json -Depth 10 | Set-Content $ffPatchPath -Encoding UTF8
    }
    
    if (Test-Path $chromiumProdPatchPath) {
        Copy-Item $chromiumProdPatchPath $chromiumPatchPath -Force
        Write-Host "  Utilizant parche Chromium de PRODUCCION" -ForegroundColor DarkGray
    }
    
    node (Join-Path $root "scripts/merge-manifest.mjs") firefox  (Join-Path $root "manifest.json")
    node (Join-Path $root "scripts/merge-manifest.mjs") chromium (Join-Path $root "manifest.chromium.json")
}

$base | ConvertTo-Json -Depth 10 | Set-Content $basePath -Encoding UTF8
Write-Host "  Fitxers base i patch actualitzats." -ForegroundColor DarkGray
Write-Host "  Manifests regenerats." -ForegroundColor DarkGray

$sizes = @(16, 32, 48, 64, 96, 128)
foreach ($sz in $sizes) {
    $src = Join-Path $imgSrcDir "icon-$sz.png"
    $dst = Join-Path $iconsDir  "icon-$sz.png"
    Copy-Item $src $dst -Force
}
Write-Host "  Icones copiades des de img/$Mode/." -ForegroundColor DarkGray
Write-Host "Fet! Mode: $($Mode.ToUpper())" -ForegroundColor Green
