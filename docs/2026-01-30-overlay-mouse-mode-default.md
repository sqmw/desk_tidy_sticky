# Overlay Mouse Mode Default

## Problem
- Persisting mouse mode (click-through vs edit) makes the app reopen in edit mode.
- This conflicts with the expected behavior: every time the overlay opens, it should start in non-edit mode.

## Decision
- Do not persist mouse mode to preferences.
- Force click-through to `true` on overlay start (panel and tray).
- Allow runtime toggling while the overlay is open.

## Implementation Notes
- Removed `overlay_click_through` from preferences.
- Panel startup now sets `OverlayController` to click-through.
- `OverlayWindowManager.startAll` always receives `initialClickThrough: true` when opening.

## Affected Files
- `lib/services/panel_preferences.dart`
- `lib/pages/panel/panel_page.dart`
- `lib/services/tray_service.dart`
