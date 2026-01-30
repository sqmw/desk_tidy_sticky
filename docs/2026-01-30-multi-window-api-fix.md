# Multi-Window API Fix (desktop_multi_window 0.3.x)

## Problem
Build errors after migration:
- `DesktopMultiWindow` symbol not found
- `WindowController.setFrame` not found

## Root Cause
`desktop_multi_window` 0.3.x exposes:
- `WindowController` / `WindowMethodChannel`
- No `DesktopMultiWindow` Dart class
- No `setFrame` method on `WindowController`

## Fix
- Use `WindowController.setWindowMethodHandler` for receiving window messages
- Use `WindowController.invokeMethod` for targeted sends
- Remove unsupported `setFrame` calls

## Affected Files
- `lib/services/window_message_service.dart`
- `lib/services/overlay_window_manager.dart`
