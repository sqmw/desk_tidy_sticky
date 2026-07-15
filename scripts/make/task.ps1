param(
  [Parameter(Position = 0)]
  [string]$Task = "help"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
Set-Location $RepoRoot

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

function Invoke-Pnpm {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  Require-Command pnpm
  & pnpm @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Invoke-Cargo {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  Require-Command cargo
  & cargo @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "cargo $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

switch ($Task) {
  "help" {
    @"
Desk Tidy Sticky make targets

  make install                Install Node dependencies with pnpm
  make dev | make start       Start the Tauri desktop app in development mode
  make frontend-dev           Start only the Vite/Svelte dev server
  make check                  Run frontend and Rust checks
  make check-frontend         Run Svelte checks
  make check-rust             Run cargo check for src-tauri
  make test                   Run frontend and Rust unit tests
  make test-frontend          Run frontend interaction tests
  make test-rust              Run Rust unit tests
  make build                  Build the Tauri release executable without bundling
  make build-frontend         Build the frontend only
  make package                Build the platform bundle with Tauri
  make package-portable       Windows only: build portable zip without stopping a running app
  make package-portable-stop  Windows only: stop a running app, then build portable zip
  make clean                  Remove local build outputs
"@
  }
  { $_ -in @("install") } {
    Invoke-Pnpm install
  }
  { $_ -in @("dev", "start") } {
    Invoke-Pnpm tauri dev
  }
  "frontend-dev" {
    Invoke-Pnpm dev
  }
  "check" {
    Invoke-Pnpm check
    Invoke-Cargo check --manifest-path src-tauri/Cargo.toml
  }
  "check-frontend" {
    Invoke-Pnpm check
  }
  "check-rust" {
    Invoke-Cargo check --manifest-path src-tauri/Cargo.toml
  }
  "test" {
    Invoke-Pnpm test:frontend
    Invoke-Cargo test --manifest-path src-tauri/Cargo.toml
  }
  "test-frontend" {
    Invoke-Pnpm test:frontend
  }
  "test-rust" {
    Invoke-Cargo test --manifest-path src-tauri/Cargo.toml
  }
  "build" {
    Invoke-Pnpm tauri build --no-bundle
  }
  "build-frontend" {
    Invoke-Pnpm build
  }
  "package" {
    Invoke-Pnpm tauri build
  }
  "package-portable" {
    & powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/build-portable-zip.ps1
    if ($LASTEXITCODE -ne 0) {
      throw "scripts/windows/build-portable-zip.ps1 failed with exit code $LASTEXITCODE"
    }
  }
  "package-portable-stop" {
    & powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/build-portable-zip.ps1 -StopRunning
    if ($LASTEXITCODE -ne 0) {
      throw "scripts/windows/build-portable-zip.ps1 -StopRunning failed with exit code $LASTEXITCODE"
    }
  }
  "clean" {
    Remove-Item -Recurse -Force build, .svelte-kit, package, src-tauri\target -ErrorAction SilentlyContinue
  }
  default {
    throw "Unknown make task: $Task. Run 'make help' for available targets."
  }
}
