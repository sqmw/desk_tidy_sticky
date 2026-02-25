# Cross-Platform Runtime Baseline (macOS first pass)

## Context
- Goal: move `desk_tidy_sticky` from Windows-only runtime assumptions to cross-platform runtime baseline.
- Trigger: macOS build path failed both on toolchain age and unconditional Win32 calls.

## Decision Summary
- Keep Windows desktop-layer behavior as-is.
- Add platform gating for Win32 internals so macOS/Linux can compile and run.
- For non-Windows, split behavior:
  - macOS: implement desktop-layer window level strategy (Plash-inspired).
  - Linux/other: keep safe no-op / Tauri-level fallback.

## Code Changes
### 1) Target-specific Rust dependency
- File: `src-tauri/Cargo.toml`
- Change:
  - Move `windows` crate from global `[dependencies]` to:
    - `[target.'cfg(target_os = "windows")'.dependencies]`
- Impact:
  - Non-Windows toolchains no longer need to resolve/link Win32 crate paths for basic compile.

### 2) Runtime platform isolation for window-layer commands
- File: `src-tauri/src/lib.rs`
- Key points:
  - `mod windows;` is now compiled only on Windows.
  - `mod macos_windows;` is now compiled only on macOS.
  - Added `window_hwnd_isize(...)` helper under `#[cfg(target_os = "windows")]`.
  - Added `window_ns_window_ptr(...)` and `run_macos_window_op(...)` under `#[cfg(target_os = "macos")]`.
  - These commands now have OS branches:
    - `apply_note_window_layer_with_interaction_by_label`
    - `pin_window_to_desktop`
    - `unpin_window_from_desktop`
    - `apply_window_no_snap_by_label`
  - Windows branch keeps original WorkerW + HWND behavior.
  - macOS branch uses main-thread NSWindow operations with desktop-level tuning.
  - Linux/other branch uses safe fallback:
    - top-most toggles only via Tauri API,
    - no desktop attach/detach,
    - no-snap command becomes no-op.

### 3) macOS desktop-layer implementation (Plash-inspired)
- File: `src-tauri/src/macos_windows.rs`
- Strategy:
  - Map "attach to desktop" to `CGWindowLevelKey::DesktopWindowLevelKey`.
  - Map "top-most" to `CGWindowLevelKey::FloatingWindowLevelKey`.
  - Reset detached state to `CGWindowLevelKey::NormalWindowLevelKey`.
  - Use `orderBack` on desktop attach so sticky windows sink behind normal app content.
  - For interactive desktop mode (click-through disabled), use `DesktopIconWindowLevel + 1` so "embedded + interactive" can coexist.
- Reference model:
  - aligned with Plash's core idea: desktop-level NSWindow instead of Windows-style WorkerW parenting.
  - local reference source:
    - `/Users/sunqin/study/language/swift/code/Plash/Plash/DesktopWindow.swift`
    - `/Users/sunqin/study/language/swift/code/Plash/Plash/Utilities.swift` (`NSWindow.Level.desktop` / `desktopIcon`)

### 4) Packaging target config
- File: `src-tauri/tauri.conf.json`
- Change:
  - `bundle.targets` from `"msi"`-only semantics to `"all"`.
- Impact:
  - Per-platform build can generate native bundles instead of hardcoding Windows installer only.

## Behavior Matrix
- Windows:
  - Keeps desktop-bottom attach, top-most switching, Aero-snap related logic.
- macOS:
  - App compiles/runs without Win32 path.
  - Sticky notes can be pushed to desktop-level layer via CG window levels.
  - "Embedded" and "Top-most" are decoupled:
    - `isAlwaysOnTop = false` => embedded desktop levels (`desktop` or `desktopIcon+1` by interaction mode)
    - `isAlwaysOnTop = true` => floating top-most level
  - Semantics are platform-equivalent-by-intent, not bit-for-bit identical to WorkerW.
- Linux/other:
  - App compiles/runs without Win32 path.
  - Sticky desktop-bottom attach remains degraded (top-level fallback only).

## Toolchain Baseline
- Local upgrade executed:
  - `rustup update stable`
  - active toolchain now: `rustc 1.93.1`, `cargo 1.93.1`
- Note:
  - Current shell uses `~/.cargo/bin` (rustup-managed).
  - If team enforces Homebrew Rust, align PATH and toolchain ownership first to avoid dual-source drift.

## Regression Checklist
1. `cargo check` in `src-tauri` passes on macOS.
2. `pnpm tauri dev` launches main window.
3. Create/pin/unpin note works without Rust panic.
4. Windows CI/local build still validates WorkerW path.

## Validation Snapshot (2026-02-25)
- `cargo check` (`src-tauri`): pass.
- `pnpm tauri build --debug --no-bundle`: pass, app binary produced.
- Notes:
  - Current known warnings are pre-existing dead-code warnings in preferences/note enums and methods, unrelated to cross-platform layer changes.
  - Workspace window builder avoids `.transparent(false)` to keep macOS compatibility (the API is gated behind Tauri `macos-private-api` feature).

## macOS Layer Contract (embed + top-most)
- `isAlwaysOnTop = false`:
  - click-through enabled => `DesktopWindowLevel` (deep embed).
  - click-through disabled => `DesktopIconWindowLevel + 1` (embedded but interactive).
- `isAlwaysOnTop = true`:
  - `FloatingWindowLevel` (top-most).
- Rationale:
  - Keep desktop embedding semantics while preserving explicit top-most switch as an independent state.
