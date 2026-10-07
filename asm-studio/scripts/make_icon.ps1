Add-Type -AssemblyName System.Drawing

$srcPng = "d:\Emu8086\asm-studio\ASM Studio 8086 Tech Logo.png"
$publicDir = "d:\Emu8086\asm-studio\public"
if (!(Test-Path $publicDir)) {
    New-Item -ItemType Directory -Path $publicDir -Force | Out-Null
}

Copy-Item $srcPng (Join-Path $publicDir "logo.png") -Force
Copy-Item $srcPng (Join-Path $publicDir "icon.png") -Force

# Load Image
$img = [System.Drawing.Image]::FromFile($srcPng)

# Create 256x256 square canvas with transparent background
$canvas = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

# Fit source aspect ratio inside 256x256 square
$scale = [Math]::Min(256.0 / $img.Width, 256.0 / $img.Height)
$destW = [int]($img.Width * $scale)
$destH = [int]($img.Height * $scale)
$destX = [int]((256 - $destW) / 2)
$destY = [int]((256 - $destH) / 2)

$g.DrawImage($img, $destX, $destY, $destW, $destH)
$g.Dispose()
$img.Dispose()

# Save as ICO
$hIcon = $canvas.GetHicon()
$ico = [System.Drawing.Icon]::FromHandle($hIcon)

$icoPath1 = "d:\Emu8086\asm-studio\public\icon.ico"
$icoPath2 = "d:\Emu8086\asm-studio\icon.ico"

$fs1 = New-Object System.IO.FileStream($icoPath1, [System.IO.FileMode]::Create)
$ico.Save($fs1)
$fs1.Close()

$fs2 = New-Object System.IO.FileStream($icoPath2, [System.IO.FileMode]::Create)
$ico.Save($fs2)
$fs2.Close()

$canvas.Dispose()
Write-Output "SUCCESS: Icon and logos copied and generated successfully!"

