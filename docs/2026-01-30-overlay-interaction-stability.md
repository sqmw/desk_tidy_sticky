# Overlay Interaction Stability Fix

## Problems
- Interactive mode could only drag once, then stopped responding.
- After relaunching in interactive mode, notes became unresponsive.
- Switching note z-order could cause distortion.

## Root Cause
Two overlay windows (top/bottom) remained visible even when empty, so the
empty layer could intercept mouse events. Z-order updates with WorkerW
reparenting could also desync window bounds during layer switches.

## Fix
- Track whether the current layer has notes and hide the window if empty.
- Apply mouse mode only when the layer is visible.
- Re-apply overlay bounds after z-order updates when WorkerW is enabled.
- Re-apply overlay bounds whenever a hidden overlay window becomes visible.
- Normalize stored note positions for DPI changes to avoid stretched/offset
  rendering when toggling z-order.
- Apply overlay bounds using `setBounds` (logical units) and perform a small
  resize refresh on Windows to keep the Flutter surface in sync after z-order
  changes.
- Keep bottom layer pinned to WorkerW even in interactive mode, so switching
  z-order does not temporarily surface all notes.
- If WorkerW attach fails, force the window to HWND_BOTTOM to avoid it
  floating above other windows.
- Limit position-update refreshes to panel windows only.

## Affected Files
- `lib/pages/overlay/overlay_page.dart`
- `lib/services/window_message_service.dart`
