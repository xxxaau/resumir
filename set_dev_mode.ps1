param (
    [ValidateSet("dev", "prod")]
    [string]$Mode = "dev"
)

$ErrorActionPreference = "Stop"

$root             = $PSScriptRoot
$manifestPath     = Join-Path $root "manifest.json"
$manifestChromium = Join-Path $root "manifest.chromium.json"
$iconsDir         = Join-Path $root "icons"
$imgSrcDir        = Join-Path $root "img\$Mode"

if (-not (Test-Path $imgSrcDir)) {
    Write-Error "No s'ha trobat '$imgSrcDir'."
    exit 1
}

$json = Get-Content $manifestPath -Raw | ConvertFrom-Json
$hasChromium = Test-Path $manifestChromium
if ($hasChromium) {
    $jsonChromium = Get-Content $manifestChromium -Raw | ConvertFrom-Json
}

if ($Mode -eq "dev") {
    Write-Host "Canviant a mode DESENVOLUPAMENT..." -ForegroundColor DarkYellow
    $json.name = "Resumir contingut (DEV)"
    $json.browser_specific_settings.gecko.id = "sergi.dev@xaudiera.xyz"
    if ($hasChromium) { $jsonChromium.name = "Resumir contingut (DEV)" }
}
elseif ($Mode -eq "prod") {
    Write-Host "Canviant a mode PRODUCCIO..." -ForegroundColor Cyan
    $json.name = "Resumir contingut"
    $json.browser_specific_settings.gecko.id = "sergi@xaudiera.xyz"
    if ($hasChromium) { $jsonChromium.name = "Resumir contingut" }
}

$json | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding UTF8
if ($hasChromium) {
    $jsonChromium | ConvertTo-Json -Depth 10 | Set-Content $manifestChromium -Encoding UTF8
}
Write-Host "  Manifests actualitzats." -ForegroundColor DarkGray

$sizes = @(16, 32, 48, 64, 96, 128)
foreach ($sz in $sizes) {
    $src = Join-Path $imgSrcDir "icon-$sz.png"
    $dst = Join-Path $iconsDir  "icon-$sz.png"
    Copy-Item $src $dst -Force
}
Write-Host "  Icones copiades des de img/$Mode/." -ForegroundColor DarkGray
Write-Host "Fet! Mode: $($Mode.ToUpper())" -ForegroundColor Green
