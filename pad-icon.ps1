Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("d:\BOTC\app-icon.png")
$w = [int]$img.Width
$h = [int]$img.Height
$pad = [int][math]::Round($w * 0.20)
$newSize = [int]($w + 2 * $pad)

$newImg = New-Object System.Drawing.Bitmap($newSize, $newSize)
$g = [System.Drawing.Graphics]::FromImage($newImg)
$g.Clear([System.Drawing.Color]::Transparent)
$g.DrawImage($img, $pad, $pad, $w, $h)

$newImg.Save("d:\BOTC\app-icon-padded.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$img.Dispose()
$newImg.Dispose()
Write-Host "Success: app-icon-padded.png created."
