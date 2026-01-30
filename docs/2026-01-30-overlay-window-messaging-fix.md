# Overlay Window Messaging Fix

## Problems
1. Overlay windows could not be closed, causing duplicates on reopen.
2. Click-through toggle did not propagate to overlay windows.
3. Some notes could not be dragged when overlay stayed in click-through mode.

## Root Cause
Window-to-window messaging used a channel that did not target specific windows,
so messages were not reliably delivered to overlay windows.

## Fix
- Switch to `DesktopMultiWindow.setMethodHandler` for receiving.
- Use `DesktopMultiWindow.invokeMethod(windowId, ...)` to target each overlay.
- Close overlay windows explicitly by enumerating all windows and filtering
  overlay types.

## Affected Files
- `lib/services/window_message_service.dart`
- `lib/services/overlay_window_manager.dart`
- `docs/2026-01-30-multi-window-migration.md`
