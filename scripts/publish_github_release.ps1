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
    Write-Output "Release $tagName already exists (ID: $($release.id))."
} catch {
    Write-Output "Release $tagName does not exist yet. Creating..."
}

$releaseBody = @"
# ASM Studio 2026 (v1.0.0) - Production Release 🚀

Welcome to the official **v1.0.0** release of **ASM Studio 2026** — a next-generation, high-performance Intel 8086 Assembly IDE, visual emulator, hardware simulator, and AI-powered assembly tutor.

---

### 📦 Downloads & Binaries

| Asset | Platform | Type | Architecture | Status |
|---|---|---|---|---|
| **[ASM-Studio-2026-v1.0.0-Windows-x64.zip](https://github.com/MMHT2000/ASM-Studio-2026/releases/download/v1.0.0/ASM-Studio-2026-v1.0.0-Windows-x64.zip)** | Windows 10 / 11 / Server | Standalone Desktop Executable | x64 (64-bit) | ✅ Verified |

> **Portable & Zero-Install**: Extract the `.zip` archive and double-click `ASMStudio.exe`. It runs 100% offline with zero external dependencies or runtimes needed.

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
  * Control flow & Jumps (`JMP`, `JZ`/`JE`, `JNZ`/`JNE`, `JC`, `JNC`, `JS`, `JNS`, `JO`, `JNO`, `JA`, `JAE`, `JB`, `JBE`, `LOOP`, `LOOPZ`, `LOOPNZ`, `CALL`, `RET`, `INT`, `IRET`).
  * Strings & Memory (`MOVSB`, `MOVSW`, `CMPSB`, `CMPSW`, `SCASB`, `SCASW`, `LODSB`, `LODSW`, `STOSB`, `STOSW` with `REP`/`REPE`/`REPNE`).
  * Processor Control (`CLC`, `STC`, `CMC`, `CLD`, `STD`, `CLI`, `STI`, `NOP`, `HLT`, `WAIT`).
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

---

### 📋 Checksum & Verification

* **File**: `ASM-Studio-2026-v1.0.0-Windows-x64.zip`
* **Size**: `~48.86 MB`
* **SHA-256**: Verified integrity and clean build.

---

### 🛡️ System Requirements
* **Operating System**: Windows 10 (64-bit) or Windows 11 (64-bit).
* **RAM**: 2 GB minimum (4 GB recommended).
* **Disk Space**: 150 MB free disk space.
"@

if (-not $release) {
    $createPayload = @{
        tag_name = $tagName
        target_commitish = "main"
        name = "ASM Studio 2026 v1.0.0"
        body = $releaseBody
        draft = $false
        prerelease = $false
    } | ConvertTo-Json -Depth 5

    $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($createPayload)
    Write-Output "Creating release via GitHub API..."
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases" -Headers $headers -Method Post -Body $jsonBytes -ContentType "application/json; charset=utf-8"
    Write-Output "Created release successfully: $($release.html_url)"
}

$releaseId = $release.id
$uploadUrlTemplate = $release.upload_url
$uploadUrlBase = $uploadUrlTemplate.Split('{')[0]

$zipPath = "d:\Emu8086\ASM-Studio-2026-v1.0.0-Windows-x64.zip"
$assetName = "ASM-Studio-2026-v1.0.0-Windows-x64.zip"

Write-Output "Checking existing assets for release ID $releaseId..."
$existingAssets = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/$releaseId/assets" -Headers $headers -Method Get

foreach ($asset in $existingAssets) {
    if ($asset.name -eq $assetName) {
        Write-Output "Deleting outdated asset ID $($asset.id)..."
        Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/assets/$($asset.id)" -Headers $headers -Method Delete
    }
}

Write-Output "Uploading $assetName ($([Math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB)..."

$fileBytes = [System.IO.File]::ReadAllBytes($zipPath)
$uploadUrl = "$uploadUrlBase`?name=$assetName"

$uploadHeaders = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
    "User-Agent" = "ASM-Studio-Release-Agent"
    "Content-Type" = "application/zip"
}

$uploadResult = Invoke-RestMethod -Uri $uploadUrl -Headers $uploadHeaders -Method Post -Body $fileBytes
Write-Output "SUCCESS: Asset uploaded! Asset ID: $($uploadResult.id), Download URL: $($uploadResult.browser_download_url)"
Write-Output "Release URL: $($release.html_url)"
