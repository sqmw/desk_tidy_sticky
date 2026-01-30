# Multi-Window Migration (desktop_multi_window)

## Goal
Replace multi-process overlay windows with same-process multi-window
implementation to simplify IPC and reduce complexity.

## Key Changes
- New dependency: `desktop_multi_window`
- New args model: `WindowArgs` for per-window metadata
- New messaging: `WindowMessageService` for refresh/close/locale sync
- Replace `OverlayProcessManager` with `OverlayWindowManager`

## Window Creation
- Panel window creates overlay windows via `WindowController.create(...)`
- Each overlay window receives JSON args for:
  - `layer` (top/bottom)
  - `monitorRectArg`
  - `embedWorkerW`

## Messaging Rules
- Messages include `sourceWindowId` to avoid self-loop.
- Commands:
  - `refresh_notes`
  - `close_overlay`
  - `set_language`
  - `set_click_through`

## Windows Runner Change
`windows/runner/flutter_window.cpp` registers plugins for sub-windows so
`desktop_multi_window` can create additional Flutter engines safely.
