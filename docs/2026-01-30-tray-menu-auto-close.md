# Tray Menu Auto Close

## Symptom
- When right-clicking the tray icon, the context menu disappears after ~1 second.
- Other apps are unaffected.

## Cause
- Panel z-order race fix re-asserted top-most **and** called `windowManager.focus()`.
- The delayed focus call steals focus from the tray menu, so the menu closes.

## Fix
- Keep the staged `setAlwaysOnTop(true)` calls.
- Remove `windowManager.focus()` so the tray menu keeps focus.
- Add a tray menu guard to suppress z-order re-asserts while the context menu is open.
- While the tray menu is open, temporarily disable `AlwaysOnTop` on the panel.

## Affected Files
- `lib/pages/panel/panel_page.dart`
- `lib/services/tray_menu_guard.dart`
- `lib/services/tray_service.dart`
