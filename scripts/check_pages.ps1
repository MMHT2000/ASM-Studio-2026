$ErrorActionPreference = "Stop"

$inputData = "protocol=https`nhost=github.com`n`n"
$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = "git"
$processInfo.Arguments = "credential fill"
$processInfo.UseShellExecute = $false
$processInfo.RedirectStandardInput = $true
$processInfo.RedirectStandardOutput = $true
$process = [System.Diagnostics.Process]::Start($processInfo)
$process.StandardInput.Write($inputData)
$process.StandardInput.Close()
$output = $process.StandardOutput.ReadToEnd()
$process.WaitForExit()

$token = ""
foreach ($line in ($output -split "`r?`n")) {
    if ($line.StartsWith("password=")) {
        $token = $line.Substring(9)
    }
}

$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
    "User-Agent" = "ASM-Studio-Deploy"
}

$repo = "MMHT2000/ASM-Studio-2026"

try {
    $pages = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/pages" -Headers $headers -Method Get
    Write-Output "Pages already active:"
    Write-Output "URL: $($pages.html_url)"
    Write-Output "Status: $($pages.status)"
    Write-Output "Source: $($pages.source.branch) / $($pages.source.path)"
} catch {
    Write-Output "Pages not enabled yet ($($_.Exception.Message)). Enabling..."
    
    # Try enabling via workflow or branch
    try {
        $body = @{
            build_type = "workflow"
        } | ConvertTo-Json
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
        $enableRes = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/pages" -Headers $headers -Method Post -Body $bytes -ContentType "application/json"
        Write-Output "Enabled GitHub Pages via GitHub Actions workflow!"
        Write-Output "URL: $($enableRes.html_url)"
    } catch {
        Write-Output "Could not enable via workflow ($($_.Exception.Message)). Will use gh-pages branch."
    }
}
