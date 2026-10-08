param (
    [string]$Version = "1.1.0"
)

$sourceDir = "d:\Emu8086\ASMStudio-v1.0-Win64"
$zipFile = "d:\Emu8086\ASM-Studio-2026-v$Version-Windows-x64.zip"

if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($sourceDir, $zipFile, [System.IO.Compression.CompressionLevel]::Optimal, $false)

$sizeMb = [Math]::Round((Get-Item $zipFile).Length / 1MB, 2)
Write-Output "SUCCESS: Created $zipFile ($sizeMb MB)"
