Add-Type -AssemblyName System.Drawing

function Draw-Icon($size, $filename) {
    try {
        $bmp = New-Object System.Drawing.Bitmap([int]$size, [int]$size)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.Clear([System.Drawing.Color]::Transparent)

        $scale = $size / 48.0
        
        # Coordinates
        $rectX = [float](8 * $scale)
        $rectY = [float](4 * $scale)
        $rectW = [float](32 * $scale)
        $rectH = [float](40 * $scale)
        $radius = [float](4 * $scale)

        # Draw Blue Rounded Rect (#0060df -> 0, 96, 223)
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 96, 223)) 
        
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = [float]($radius * 2)
        
        $path.AddArc($rectX, $rectY, $d, $d, 180, 90)
        $path.AddArc([float]($rectX + $rectW - $d), $rectY, $d, $d, 270, 90)
        $path.AddArc([float]($rectX + $rectW - $d), [float]($rectY + $rectH - $d), $d, $d, 0, 90)
        $path.AddArc($rectX, [float]($rectY + $rectH - $d), $d, $d, 90, 90)
        $path.CloseFigure()
        
        $g.FillPath($brush, $path)

        # Draw White Lines
        $strokeWidth = [float](3 * $scale)
        $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $strokeWidth)
        $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

        # Line 1
        $g.DrawLine($pen, [float](16 * $scale), [float](14 * $scale), [float](32 * $scale), [float](14 * $scale))
        # Line 2
        $g.DrawLine($pen, [float](16 * $scale), [float](22 * $scale), [float](32 * $scale), [float](22 * $scale))
        # Line 3
        $g.DrawLine($pen, [float](16 * $scale), [float](30 * $scale), [float](26 * $scale), [float](30 * $scale))

        $bmp.Save($filename, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host "Success: $filename"
    }
    catch {
        Write-Error "Failed to generate $filename : $_"
    }
    finally {
        if ($g) { $g.Dispose() }
        if ($bmp) { $bmp.Dispose() }
        if ($pen) { $pen.Dispose() }
        if ($brush) { $brush.Dispose() }
        if ($path) { $path.Dispose() }
    }
}

$baseDir = "d:/40361989w/Dev/sergi-resum-navegador/icons"
if (-not (Test-Path $baseDir)) { New-Item -ItemType Directory -Force -Path $baseDir }

Draw-Icon 16 "$baseDir/icon-16.png"
Draw-Icon 32 "$baseDir/icon-32.png"
Draw-Icon 48 "$baseDir/icon-48.png"
Draw-Icon 64 "$baseDir/icon-64.png"
Draw-Icon 96 "$baseDir/icon-96.png"
Draw-Icon 128 "$baseDir/icon-128.png"
