param (
    [string]$Mode = "dev" # "dev" or "prod"
)

$manifestPath = "d:/40361989w/Dev/sergi-firefox-resum/manifest.json"
$iconsDir = "d:/40361989w/Dev/sergi-firefox-resum/icons"

# Read Manifest
$json = Get-Content -Path $manifestPath -Raw | ConvertFrom-Json

if ($Mode -eq "dev") {
    Write-Host "Switching to DEVELOPMENT mode..."
    
    # Update Manifest
    $json.name = "Resumir contingut (DEV)"
    $json.browser_specific_settings.gecko.id = "sergi-firefox-resum-dev@example.com"
    
    # Save Manifest
    $json | ConvertTo-Json -Depth 10 | Set-Content -Path $manifestPath
    Write-Host "Manifest updated with DEV ID."

    # Generate DEV Icons (Orange/Red)
    Add-Type -AssemblyName System.Drawing
    
    function Draw-Dev-Icon($size, $filename) {
        $bmp = New-Object System.Drawing.Bitmap([int]$size, [int]$size)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.Clear([System.Drawing.Color]::Transparent)
        $scale = $size / 48.0
        
        # Draw Orange/Red Rounded Rect for DEV
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 140, 0)) # Dark Orange
        $g.FillEllipse($brush, 0, 0, $size, $size)
        
        # Text "DEV"
        $fontSize = 14 * $scale
        $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
        $textBrush = [System.Drawing.Brushes]::White
        $stringFormat = New-Object System.Drawing.StringFormat
        $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
        $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
        
        $g.DrawString("DEV", $font, $textBrush, [float]($size / 2), [float]($size / 2), $stringFormat)
        
        $bmp.Save($filename, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose(); $bmp.Dispose(); $font.Dispose()
    }
    
    Draw-Dev-Icon 48 "$iconsDir/icon-48.png"
    Draw-Dev-Icon 96 "$iconsDir/icon-96.png"
    # Copy for others
    Copy-Item "$iconsDir/icon-48.png" "$iconsDir/icon-16.png" -Force
    Copy-Item "$iconsDir/icon-48.png" "$iconsDir/icon-32.png" -Force
    Copy-Item "$iconsDir/icon-96.png" "$iconsDir/icon-64.png" -Force
    Copy-Item "$iconsDir/icon-96.png" "$iconsDir/icon-128.png" -Force
    
    Write-Host "Icons updated to DEV style."

}
elseif ($Mode -eq "prod") {
    Write-Host "Switching to PRODUCTION mode..."
    
    # Restore Manifest
    $json.name = "Resumir contingut"
    $json.browser_specific_settings.gecko.id = "sergi@xaudiera.xyz"
    
    # Save Manifest
    $json | ConvertTo-Json -Depth 10 | Set-Content -Path $manifestPath
    Write-Host "Manifest restored to PROD ID."
    
    # Regenerate Original Icons
    & "d:/40361989w/Dev/sergi-firefox-resum/generate_icons_blue.ps1"
    Write-Host "Icons restored to PROD style."
}
else {
    Write-Host "Invalid mode. Use 'dev' or 'prod'."
}
