# Panel Dock/Taskbar Visibility + Minimize Control (2026-02-25)

## Context
- Existing behavior hid main/workspace windows from Dock/taskbar (`skipTaskbar=true`).
- Custom title bars only exposed maximize + hide(close-as-hide), missing explicit minimize.
- UX target: keep `close = hide` unchanged, but add standard minimize entry and visible app icon in Dock/taskbar.

## Decision
- Make `main` and `workspace` windows visible in Dock/taskbar.
- Add `Minimize` action to both panel header and workspace header.
- Keep close button semantics unchanged (`hide()`), not process/window destroy.

## Behavior Contract
- Close button:
  - still uses hide semantics (not destroy/quit), but now routed by backend unified command.
  - when all panel windows are hidden:
    - macOS: Dock icon is hidden (switch to Accessory policy), only menu bar icon remains.
    - Windows: taskbar icon is hidden; reopen via tray/shortcut restores it.
- Minimize button:
  - calls `minimize()`.
  - users can restore via Dock/taskbar click.
- Sticky note windows and break overlay windows:
  - remain `skipTaskbar=true` to avoid taskbar noise.

## Code Changes
1. Dock/taskbar visibility for app windows
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/tauri.conf.json`
  - `main.skipTaskbar: false`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
  - runtime-created `workspace` window `.skip_taskbar(false)`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/panel/switch-panel-window.js`
  - frontend-created `workspace` window `skipTaskbar: false`

2. Minimize capability
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/capabilities/default.json`
  - add `core:window:allow-minimize`

3. Header action updates
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceWindowBar.svelte`
  - add `onMinimize` prop and minimize icon button
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/workspace/+page.svelte`
  - add `minimizeWindow()` and bind to `WorkspaceWindowBar`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/panel/HeaderActions.svelte`
  - add minimize button (`-`) next to close
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/panel/PanelHeader.svelte`
  - pass `minimizeWindow` to `HeaderActions`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/+page.svelte`
  - implement/passthrough `minimizeWindow()` for compact panel

4. i18n strings
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/strings.js`
  - add `minimizeWindow` for `en` / `zh`

5. Unified close-as-hide shell policy
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
  - add `hide_panel_window` command
  - add `sync_panel_window_shell_state`:
    - visible panel window => `skip_taskbar=false`
    - hidden panel window => `skip_taskbar=true`
    - macOS all hidden => app activation policy set to `Accessory`
    - any shown => app activation policy set back to `Regular`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/+page.svelte`
  - close action now invokes `hide_panel_window`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/workspace/+page.svelte`
  - close action now invokes `hide_panel_window`

## Regression Checklist
1. Launch app and verify Dock/taskbar icon is visible when main/workspace window is shown.
2. Compact panel `-` minimizes window and can be restored from Dock/taskbar.
3. Workspace top-bar minimize behaves the same.
4. Close button still hides window (does not exit).
5. Sticky note windows still do not create extra Dock/taskbar entries.
6. Close panel window and verify:
   - macOS Dock icon disappears (menu bar tray remains).
   - Windows taskbar icon disappears (tray remains).
7. Trigger tray “Show main window” and verify Dock/taskbar icon is restored.

## 2026-04-13 Addendum: intermittent minimize no-op fix

### Classification
- Type: `Bug/Regression`
- Symptom: sometimes clicking the minimize button on either the compact panel or workspace window had no visible effect.

### Root Cause
1. The old implementation called `getCurrentWindow().minimize()` directly from the frontend.
2. In this app, panel shell state is centrally managed by Rust:
   - Dock/taskbar visibility
   - activation policy
   - close-as-hide behavior
3. Direct frontend minimize bypassed that shell-state reconciliation path, so after hide/reopen or Dock visibility transitions, minimize could occasionally become out of sync with the actual window shell state.

### Fix
1. Added backend command `minimize_panel_window`:
   - resolves the target panel (`main` / `workspace`)
   - forces `skip_taskbar=false`
   - on macOS restores `ActivationPolicy::Regular`
   - executes `show -> unminimize -> minimize`
   - then runs `sync_panel_window_shell_state(&app)`
2. Both compact and workspace minimize buttons now call the backend command instead of invoking frontend `minimize()` directly.

### Impacted Files
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/+page.svelte`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/workspace/+page.svelte`

### Regression Checklist
1. Open both compact panel and workspace windows.
2. Repeatedly run the sequence: show -> hide -> reopen -> minimize.
3. Confirm the minimize button always sends the window into the system minimized state.
4. Restore from Dock/taskbar and minimize again to confirm the behavior remains stable.
