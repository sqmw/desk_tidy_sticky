#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/../.." && pwd)
cd "$repo_root"

task="${1:-help}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 127
  fi
}

run_pnpm() {
  need pnpm
  pnpm "$@"
}

run_cargo() {
  need cargo
  cargo "$@"
}

case "$task" in
  help)
    cat <<'EOF'
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
EOF
    ;;
  install)
    run_pnpm install
    ;;
  dev|start)
    run_pnpm tauri dev
    ;;
  frontend-dev)
    run_pnpm dev
    ;;
  check)
    run_pnpm check
    run_cargo check --manifest-path src-tauri/Cargo.toml
    ;;
  check-frontend)
    run_pnpm check
    ;;
  check-rust)
    run_cargo check --manifest-path src-tauri/Cargo.toml
    ;;
  test)
    run_pnpm test:frontend
    run_cargo test --manifest-path src-tauri/Cargo.toml
    ;;
  test-frontend)
    run_pnpm test:frontend
    ;;
  test-rust)
    run_cargo test --manifest-path src-tauri/Cargo.toml
    ;;
  build)
    run_pnpm tauri build --no-bundle
    ;;
  build-frontend)
    run_pnpm build
    ;;
  package)
    run_pnpm tauri build
    ;;
  package-portable|package-portable-stop)
    echo "The portable zip target is Windows-only. Run this target on Windows." >&2
    exit 2
    ;;
  clean)
    rm -rf build .svelte-kit package src-tauri/target
    ;;
  *)
    echo "Unknown make task: $task" >&2
    echo "Run 'make help' for available targets." >&2
    exit 2
    ;;
esac
