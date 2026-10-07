$ErrorActionPreference = "Stop"

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
$tagName = "v1.0.0"

Write-Output "Checking existing release for $tagName..."
$release = $null
try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/tags/$tagName" -Headers $headers -Method Get
    Write-Output "Release $tagName found (ID: $($release.id))."
} catch {
    Write-Output "Release $tagName does not exist yet."
}

$releaseBody = @"
# ASM Studio 2026 (v1.0.0) — Multi-Platform Production Release 🚀

Welcome to the official **v1.0.0** release of **ASM Studio 2026** — a next-generation, high-performance Intel 8086 Assembly IDE, visual hardware emulator, time-travel debugger, and AI-powered assembly tutor.

Now featuring **native support for both Windows and Ubuntu/Linux**! 🐧💻

---

### 📦 Official Binaries & Packages

| Platform | Package Format | Download Link | Size | Instructions |
|---|---|---|---|---|
| **Ubuntu / Debian** | `.deb` Native Package | **[asm-studio-2026_1.0.0_amd64.deb](https://github.com/MMHT2000/ASM-Studio-2026/releases/download/v1.0.0/asm-studio-2026_1.0.0_amd64.deb)** | ~109 MB | `sudo dpkg -i asm-studio-2026_1.0.0_amd64.deb` |
| **Linux (Universal)** | Portable `.tar.gz` | **[ASM-Studio-2026-v1.0.0-Linux-x64.tar.gz](https://github.com/MMHT2000/ASM-Studio-2026/releases/download/v1.0.0/ASM-Studio-2026-v1.0.0-Linux-x64.tar.gz)** | ~108 MB | Extract & run `./asm-studio` or `./install.sh` |
| **Windows** | Standalone `.zip` | **[ASM-Studio-2026-v1.0.0-Windows-x64.zip](https://github.com/MMHT2000/ASM-Studio-2026/releases/download/v1.0.0/ASM-Studio-2026-v1.0.0-Windows-x64.zip)** | ~48.8 MB | Extract and launch `ASMStudio.exe` |

---

### 🐧 Ubuntu & Linux Installation Guide

#### Option A: Native Debian/Ubuntu Package (`.deb`)
Recommended for Ubuntu 20.04, 22.04, 24.04, and Debian-based systems.
```bash
# 1. Download the package
wget https://github.com/MMHT2000/ASM-Studio-2026/releases/download/v1.0.0/asm-studio-2026_1.0.0_amd64.deb

# 2. Install using apt (automatically resolves any dependencies)
sudo apt update
sudo apt install ./asm-studio-2026_1.0.0_amd64.deb

# 3. Launch from Ubuntu application launcher or terminal
asm-studio
```

#### Option B: Portable Tarball (`.tar.gz`)
Works on any x86_64 Linux distribution (Fedora, Arch, Linux Mint, openSUSE) with zero root privileges:
```bash
# 1. Download and extract
wget https://github.com/MMHT2000/ASM-Studio-2026/releases/download/v1.0.0/ASM-Studio-2026-v1.0.0-Linux-x64.tar.gz
tar -xzf ASM-Studio-2026-v1.0.0-Linux-x64.tar.gz
cd ASM-Studio-2026-v1.0.0-Linux-x64

# 2. Run directly
./asm-studio

# 3. Optional: Install to your desktop application menu
chmod +x install.sh
./install.sh
```

---

### 💻 Windows Installation Guide
1. Download `ASM-Studio-2026-v1.0.0-Windows-x64.zip`.
2. Extract the archive anywhere on your machine.
3. Double-click `ASMStudio.exe` — runs 100% offline with zero dependencies or installers.

---

### ✨ Highlights & Key Features

* 💻 **Complete Intel 8086 Architecture Simulator**:
  * Real-mode 1MB segmented memory (`CS`, `DS`, `SS`, `ES`).
  * 16-bit General Purpose Registers (`AX`, `BX`, `CX`, `DX` with high/low 8-bit split access).
  * Pointer & Index Registers (`SP`, `BP`, `SI`, `DI`, `IP`).
  * Real-time Flags register display (`CF`, `PF`, `AF`, `ZF`, `SF`, `TF`, `IF`, `DF`, `OF`).
* ⚡ **Full Instruction Set Support**:
  * Data movement (`MOV`, `XCHG`, `PUSH`, `POP`, `LEA`, `LDS`, `LES`).
  * Arithmetic (`ADD`, `SUB`, `ADC`, `SBB`, `INC`, `DEC`, `MUL`, `IMUL`, `DIV`, `IDIV`, `NEG`, `DAA`, `AAA`, `DAS`, `AAS`).
  * Logic & Bitwise (`AND`, `OR`, `XOR`, `NOT`, `TEST`, `SHL`, `SHR`, `SAL`, `SAR`, `ROL`, `ROR`, `RCL`, `RCR`).
  * Control flow & Jumps (`JMP`, `JZ`/`JE`, `JNZ`/`JNE`, `JC`, `JNC`, `JS`, `JNS`, `JO`, `JNO`, `JA`, `JAE`, `JB`, `JBE`, `LOOP`, `CALL`, `RET`, `INT`, `IRET`).
  * Strings & Memory (`MOVSB`, `MOVSW`, `CMPSB`, `CMPSW`, `SCASB`, `SCASW`, `LODSB`, `LODSW`, `STOSB`, `STOSW` with `REP`/`REPE`/`REPNE`).
* 🖥️ **Interactive Hardware Devices**:
  * **VGA Text Screen / Video Display**: Real-time rendering of INT 10h BIOS display services and INT 21h DOS output routines.
  * **Visual Memory Grid**: Real-time hex dump and ASCII inspection with search, address navigation, and live byte highlighting.
  * **Interactive Stack Visualizer**: Dynamic visual representation of `SS:SP` push/pop frames and function call records.
  * **Traffic Lights, Stepper Motor, & 7-Segment Displays**: Real-time virtual hardware bus peripherals.
* 🤖 **Multi-Provider AI Assembly Assistant**:
  * Live code review, automatic bug detection, step-by-step logic explanation, and performance optimization.
  * Configurable LLM Providers: **Google Gemini**, **OpenAI**, and **Anthropic Claude**.
  * Fully customizable model names, system prompts, temperatures, and custom base URLs.
* 🎨 **Deep Customization & Theming**:
  * Theme switcher (Cyber Dark, Slate Navy, Matrix Green, Classic Light, High Contrast).
  * Custom editor backgrounds, syntax colors, font families, and sizes.
  * Adjustable step-by-step emulation speeds (1 Hz to Max Speed).
"@

if ($release) {
    Write-Output "Updating release notes for ID $($release.id)..."
    $updatePayload = @{
        name = "ASM Studio 2026 v1.0.0 (Windows & Ubuntu/Linux)"
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
        Path = "d:\Emu8086\asm-studio-2026_1.0.0_amd64.deb"
        Name = "asm-studio-2026_1.0.0_amd64.deb"
        ContentType = "application/vnd.debian.binary-package"
    },
    @{
        Path = "d:\Emu8086\ASM-Studio-2026-v1.0.0-Linux-x64.tar.gz"
        Name = "ASM-Studio-2026-v1.0.0-Linux-x64.tar.gz"
        ContentType = "application/gzip"
    },
    @{
        Path = "d:\Emu8086\ASM-Studio-2026-v1.0.0-Windows-x64.zip"
        Name = "ASM-Studio-2026-v1.0.0-Windows-x64.zip"
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

    $alreadyUploaded = $false
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
Write-Output "🎉 ALL RELEASE ASSETS UPLOADED SUCCESSFULLY!"
Write-Output "Release Page: $($release.html_url)"
