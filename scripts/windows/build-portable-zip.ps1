param(
  [switch]$SkipBuild,
  [string]$Version
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..\..")
Set-Location $repoRoot

if (-not $Version) {
  $tauriConfig = Get-Content (Join-Path $repoRoot "src-tauri\tauri.conf.json") -Raw | ConvertFrom-Json
  $Version = [string]$tauriConfig.version
}

$exeName = "desk_tidy_sticky.exe"
$releaseDir = Join-Path $repoRoot "src-tauri\target\release"
$exePath = Join-Path $releaseDir $exeName
$portableRoot = Join-Path $releaseDir "bundle\portable"
$portableName = "Desk Tidy Sticky_${Version}_x64_portable"
$stageDir = Join-Path $portableRoot $portableName
$zipPath = Join-Path $portableRoot "$portableName.zip"
$portableReadme = Join-Path $stageDir "README-Portable.txt"

if (-not $SkipBuild) {
  Get-Process desk_tidy_sticky -ErrorAction SilentlyContinue | Stop-Process -Force
  & pnpm tauri build -- --no-bundle
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm tauri build -- --no-bundle failed with exit code $LASTEXITCODE"
  }
}

if (-not (Test-Path $exePath)) {
  throw "Release executable not found: $exePath"
}

New-Item -ItemType Directory -Force -Path $portableRoot | Out-Null
if (Test-Path $stageDir) {
  Remove-Item -Recurse -Force $stageDir
}
New-Item -ItemType Directory -Force -Path $stageDir | Out-Null

Copy-Item $exePath -Destination (Join-Path $stageDir $exeName)
if (Test-Path (Join-Path $repoRoot "README.md")) {
  Copy-Item (Join-Path $repoRoot "README.md") -Destination (Join-Path $stageDir "README.md")
}
if (Test-Path (Join-Path $repoRoot "README.en.md")) {
  Copy-Item (Join-Path $repoRoot "README.en.md") -Destination (Join-Path $stageDir "README.en.md")
}

$portableReadmeContent = @"
Desk Tidy Sticky Portable
Version: $Version

Usage:
1. Extract this archive to any writable folder.
2. Run desk_tidy_sticky.exe directly.

Notes:
- This portable package does not create Start Menu or desktop shortcuts.
- Windows needs Microsoft Edge WebView2 Runtime installed.
- User data is still stored in the normal app data directory, not beside the exe.
"@

Set-Content -Path $portableReadme -Value $portableReadmeContent -Encoding UTF8

if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}

Compress-Archive -Path (Join-Path $stageDir "*") -DestinationPath $zipPath -Force

Write-Host "Portable folder: $stageDir"
Write-Host "Portable zip: $zipPath"
