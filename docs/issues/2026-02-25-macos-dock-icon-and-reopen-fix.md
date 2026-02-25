# macOS Dock Icon Source + Reopen Behavior Fix (2026-02-25)

## Context
- Symptom 1: Dock icon still showed a non-product/default-looking icon in dev/runtime.
- Symptom 2: Clicking Dock icon did not restore panel/workspace window after hide/minimize.

## Diagnosis
- Root cause A (icon source):
  - Tray icon path was hardcoded to `icon.ico` in Rust setup path, which is not a proper macOS icon source.
  - Existing PNG icon set in `src-tauri/icons` still contained older scaffold assets, so runtime/default icon resolution could pick the wrong PNG variant.
- Root cause B (window restore):
  - App runtime did not handle `RunEvent::Reopen` (macOS `applicationShouldHandleReopen`).
  - Hidden/minimized windows were not explicitly unminimized before focus.
- Root cause C (icon update not taking effect):
  - Tauri build script only tracked `tauri.conf.json` changes (`rerun-if-changed=tauri.conf.json`).
  - Replacing files under `src-tauri/icons` alone did not refresh generated app context icon payloads.

## Fix
1. Add unified window reveal helper
- File: `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- Added `show_and_focus_window(window)`:
  - `show()`
  - `unminimize()`
  - `set_focus()`
- `show_preferred_panel_window` now uses this helper for both `main` and `workspace`.

2. Handle macOS Dock reopen event
- File: `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- Switched to `Builder::build(...)` + `app.run(...)` callback.
- On `tauri::RunEvent::Reopen` (macOS), call `show_preferred_panel_window(app_handle)`.

3. Keep tray(top menu bar) icon behavior unchanged
- File: `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- Keep tray in template mode, now using dedicated template asset (`tray-template.png`) for macOS menu bar.

4. Force-set macOS Dock icon on startup (without changing top tray behavior)
- Files:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/macos_windows.rs`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- Add `set_application_icon_from_png(...)` using `NSApplication.setApplicationIconImage(...)`.
- Call this on startup via main-window `run_on_main_thread`.
- Current icon source for this runtime path:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.png`
  - (Dock-specific padded variant to keep visual size aligned with other apps)

5. Regenerate icon assets to product icon set
- Directory: `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons`
- Regenerated `icon.icns`, `icon.ico`, `icon.png`, `32x32.png`, `128x128.png`, `128x128@2x.png`, and Appx logo sizes from current product icon source.
- Purpose: eliminate stale scaffold icon variants from default icon resolution path.

6. Force Tauri context icon refresh
- File: `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/tauri.conf.json`
- Updated `bundle.icon` list to include `icons/icon.png` explicitly (and changed file content) so tauri-build reruns and re-embeds icon assets.
- Executed cache reset:
  - `cargo clean -p desk_tidy_sticky`
  - then rebuild/dev run

## Regression Checklist
1. Run `pnpm tauri dev`.
2. Hide/minimize panel/workspace.
3. Click Dock icon:
  - Expected: preferred panel window (`main` or `workspace`) is restored and focused.
4. Verify Dock icon is the colored product icon and tray icon is monochrome template style, not old scaffold/default icon.
5. Verify close behavior remains unchanged (`close => hide`, no forced process exit).

## Validation Snapshot
- `cargo check` (in `src-tauri`) passed.
- `pnpm tauri dev` startup path passed (no Rust compile errors).
- Note: final Dock click behavior requires manual UI interaction on host desktop session.
