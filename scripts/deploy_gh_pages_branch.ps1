$ErrorActionPreference = "Stop"

$root = "d:\Emu8086"
$distDir = "$root\asm-studio\dist"
$tempGit = "$root\gh-pages-staging"

Write-Output "Preparing gh-pages deploy directory..."
if (Test-Path $tempGit) {
    Remove-Item $tempGit -Recurse -Force
}
New-Item -ItemType Directory -Path $tempGit | Out-Null

Copy-Item "$distDir\*" -Destination $tempGit -Recurse -Force

# Create .nojekyll so GitHub Pages doesn't ignore files starting with underscore
New-Item -ItemType File -Path "$tempGit\.nojekyll" -Force | Out-Null

Set-Location $tempGit

Write-Output "Initializing git for gh-pages..."
git init -b gh-pages
git config user.name "MMHT2000"
git config user.email "tashinggara129@gmail.com"
git add -A
git commit -m "deploy: initial GitHub Pages deployment for ASM Studio 2026"

Write-Output "Pushing to origin gh-pages..."
git remote add origin https://github.com/MMHT2000/ASM-Studio-2026.git
git push origin gh-pages --force

Set-Location $root
Remove-Item $tempGit -Recurse -Force
Write-Output "SUCCESS: gh-pages branch published to GitHub!"
