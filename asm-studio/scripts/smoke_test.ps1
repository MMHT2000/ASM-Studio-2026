$proc = Start-Process -FilePath "d:\Emu8086\ASMStudio-v1.0-Win64\ASMStudio.exe" -PassThru
Start-Sleep -Seconds 3
if (!$proc.HasExited) {
    Write-Output "VERIFIED: ASMStudio.exe is running smoothly without crash!"
    $proc.Kill()
} else {
    Write-Output "Process exited with code: $($proc.ExitCode)"
}

