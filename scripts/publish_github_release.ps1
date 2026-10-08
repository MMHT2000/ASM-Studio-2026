param (
    [string]$TagName = "v1.1.0"
)

$ErrorActionPreference = "Stop"

# Extract numeric version
$version = $TagName.TrimStart('v')

# 1. Fetch credentials
$inputData = "protocol=https`nhost=github.com`n`n"
$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = "git"
$processInfo.Arguments = "credential fill"
$processInfo.UseShellExecute = $false
$processInfo.RedirectStandardInput = $true
$processInfo.RedirectStandardOutput = $true
$process = [System.Diagnostics.Process]::Start($processInfo)
$process.StandardInput.Write($inputData)
$process.StandardInput.Flush()
$process.StandardInput.Close()
$output = $process.StandardOutput.ReadToEnd()
$process.WaitForExit()

$token = ""
foreach ($line in ($output -split "`r?`n")) {
    if ($line.StartsWith("password=")) {
        $token = $line.Substring(9)
    }
}

if (-not $token) {
    Write-Error "Could not retrieve GitHub token from git credentials."
    exit 1
}

$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
    "User-Agent" = "ASM-Studio-Release-Agent"
}

$repo = "MMHT2000/ASM-Studio-2026"

Write-Output "Checking existing release for $TagName..."
$release = $null
try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/tags/$TagName" -Headers $headers -Method Get
    Write-Output "Release $TagName found (ID: $($release.id))."
} catch {
    Write-Output "Release $TagName does not exist yet. Will create."
}

$releaseBody = @"
# ASM Studio 2026 ($TagName) — Multi-Platform Production Release 🚀

Welcome to **$TagName** of **ASM Studio 2026** — the high-performance Intel 8086 Assembly IDE, hardware emulator, time-travel debugger, and AI-powered assembly tutor.

Now featuring **native binaries for Windows, Ubuntu/Debian, Universal Linux, and zero-install Web deployment**! 🐧💻🌐

---

### 📦 Official Binaries & Packages

| Platform | Package Format | Download Link | Size | Instructions |
|---|---|---|---|---|
| **Ubuntu / Debian** | `.deb` Native Package | **[asm-studio-2026_${version}_amd64.deb](https://github.com/MMHT2000/ASM-Studio-2026/releases/download/$TagName/asm-studio-2026_${version}_amd64.deb)** | ~109 MB | `sudo apt install ./asm-studio-2026_${version}_amd64.deb` |
| **Linux (Universal)** | Portable `.tar.gz` | **[ASM-Studio-2026-${TagName}-Linux-x64.tar.gz](https://github.com/MMHT2000/ASM-Studio-2026/releases/download/$TagName/ASM-Studio-2026-${TagName}-Linux-x64.tar.gz)** | ~108 MB | Extract & run `./asm-studio` or `./install.sh` |
| **Windows 10 / 11** | Standalone `.zip` | **[ASM-Studio-2026-${TagName}-Windows-x64.zip](https://github.com/MMHT2000/ASM-Studio-2026/releases/download/$TagName/ASM-Studio-2026-${TagName}-Windows-x64.zip)** | ~49 MB | Extract and launch `ASMStudio.exe` |
| **Web (Instant Access)** | Browser SPA | **[https://mmht2000.github.io/ASM-Studio-2026/](https://mmht2000.github.io/ASM-Studio-2026/)** | 0 MB | Zero install, works in all browsers |

---

### 🌟 What's New in ${TagName}:

* 🐧 **Native Ubuntu / Debian Package (`.deb`)**:
  * One-click installation via `sudo apt install ./asm-studio-2026_${version}_amd64.deb`.
  * Installs desktop icon to `/usr/share/icons/hicolor/...` and registers `asm-studio` command in PATH.
* 📦 **Universal Linux Portable Bundle (`.tar.gz`)**:
  * Runs on Fedora, Arch Linux, Linux Mint, Debian, and openSUSE without root privileges.
  * Includes `install.sh` user-level desktop installer.
* 🎨 **Reorganized Sleek Ribbon**:
  * Replaced bloated buttons with modern segmented button clusters (VS Code / JetBrains style).
  * Grouped Assemble, Playback with clock picker, and Step Back/Forward controls.
* 🖥️ **Dedicated Bottom Status Bar (`StatusBar.tsx`)**:
  * Live status indicator, syntax error counters, CPU registers (`IP`, `SP`, `Steps`), architecture mode, and active AI indicator.
* 🌐 **Live GitHub Pages Web Deployment**:
  * Accessible globally for students, educators, and schools at `https://mmht2000.github.io/ASM-Studio-2026/`.
* ☕ **Community Funding**:
  * Added Buy Me a Coffee integration in toolbar, settings, and documentation.

---

### 🐧 Ubuntu & Linux Installation Guide

#### Option A: Native Debian/Ubuntu Package (`.deb`)
Recommended for Ubuntu 20.04, 22.04, 24.04, and Debian-based systems:
```bash
# 1. Download the package
wget https://github.com/MMHT2000/ASM-Studio-2026/releases/download/$TagName/asm-studio-2026_${version}_amd64.deb

# 2. Install using apt (resolves any dependencies automatically)
sudo apt update
sudo apt install ./asm-studio-2026_${version}_amd64.deb

# 3. Launch from Ubuntu application launcher or terminal
asm-studio
```

#### Option B: Portable Tarball (`.tar.gz`)
Works on any x86_64 Linux distribution:
```bash
# 1. Download and extract
wget https://github.com/MMHT2000/ASM-Studio-2026/releases/download/$TagName/ASM-Studio-2026-${TagName}-Linux-x64.tar.gz
tar -xzf ASM-Studio-2026-${TagName}-Linux-x64.tar.gz
cd ASM-Studio-2026-${TagName}-Linux-x64

# 2. Run directly
./asm-studio

# 3. (Optional) Install to desktop menu
chmod +x install.sh
./install.sh
```

---

### 💻 Windows Installation Guide
1. Download `ASM-Studio-2026-${TagName}-Windows-x64.zip`.
2. Extract the archive anywhere on your disk.
3. Double-click `ASMStudio.exe` — runs 100% offline with zero dependencies or installers.

---

### ☕ Support the Project
If you enjoy using **ASM Studio 2026** for your coursework, university studies, or retro computing, consider supporting development:
👉 **[buymeacoffee.com/MMHT2000](https://buymeacoffee.com/MMHT2000)**
"@

if (-not $release) {
    $createPayload = @{
        tag_name = $TagName
        target_commitish = "main"
        name = "ASM Studio 2026 $TagName (Windows & Ubuntu/Linux)"
        body = $releaseBody
        draft = $false
        prerelease = $false
    } | ConvertTo-Json -Depth 5

    $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($createPayload)
    Write-Output "Creating release $TagName via GitHub API..."
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases" -Headers $headers -Method Post -Body $jsonBytes -ContentType "application/json; charset=utf-8"
    Write-Output "Created release successfully: $($release.html_url)"
} else {
    Write-Output "Updating release notes for ID $($release.id)..."
    $updatePayload = @{
        name = "ASM Studio 2026 $TagName (Windows & Ubuntu/Linux)"
        body = $releaseBody
    } | ConvertTo-Json -Depth 5
    $updateBytes = [System.Text.Encoding]::UTF8.GetBytes($updatePayload)
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/$($release.id)" -Headers $headers -Method Patch -Body $updateBytes -ContentType "application/json; charset=utf-8"
    Write-Output "Release notes updated successfully."
}

$releaseId = $release.id
$uploadUrlTemplate = $release.upload_url
$uploadUrlBase = $uploadUrlTemplate.Split('{')[0]

$assetsToUpload = @(
    @{
        Path = "d:\Emu8086\asm-studio-2026_${version}_amd64.deb"
        Name = "asm-studio-2026_${version}_amd64.deb"
        ContentType = "application/vnd.debian.binary-package"
    },
    @{
        Path = "d:\Emu8086\ASM-Studio-2026-${TagName}-Linux-x64.tar.gz"
        Name = "ASM-Studio-2026-${TagName}-Linux-x64.tar.gz"
        ContentType = "application/gzip"
    },
    @{
        Path = "d:\Emu8086\ASM-Studio-2026-${TagName}-Windows-x64.zip"
        Name = "ASM-Studio-2026-${TagName}-Windows-x64.zip"
        ContentType = "application/zip"
    }
)

Write-Output "Checking existing assets for release ID $releaseId..."
$existingAssets = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/$releaseId/assets" -Headers $headers -Method Get

foreach ($asset in $assetsToUpload) {
    $assetName = $asset.Name
    $filePath = $asset.Path
    $contentType = $asset.ContentType

    if (-not (Test-Path $filePath)) {
        Write-Warning "File not found: $filePath. Skipping."
        continue
    }

    foreach ($ea in $existingAssets) {
        if ($ea.name -eq $assetName) {
            Write-Output "Asset $assetName already exists (ID $($ea.id)). Re-uploading..."
            Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/assets/$($ea.id)" -Headers $headers -Method Delete
            break
        }
    }

    $sizeMb = [Math]::Round((Get-Item $filePath).Length / 1MB, 2)
    Write-Output "Uploading $assetName ($sizeMb MB)..."

    $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
    $uploadUrl = "$uploadUrlBase`?name=$assetName"

    $uploadHeaders = @{
        "Authorization" = "token $token"
        "Accept" = "application/vnd.github.v3+json"
        "User-Agent" = "ASM-Studio-Release-Agent"
        "Content-Type" = $contentType
    }

    $uploadResult = Invoke-RestMethod -Uri $uploadUrl -Headers $uploadHeaders -Method Post -Body $fileBytes
    Write-Output "SUCCESS: $assetName uploaded! (Download: $($uploadResult.browser_download_url))"
}

Write-Output ""
Write-Output "🎉 ALL RELEASE ASSETS UPLOADED SUCCESSFULLY FOR $TagName!"
Write-Output "Release Page: $($release.html_url)"
