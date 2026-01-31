# Desktop Sticky Startup Preferences

## Requirements
- Desktop sticky state should persist across restarts.
- Mouse mode should default to click-through (non-edit) on startup.

## Changes
- Added desktop sticky preferences:
  - `overlay_enabled`
- On panel startup:
  - Load persisted sticky enabled state
  - Force click-through default for each session
  - Auto-start sticky windows when enabled
- On sticky toggle:
  - Persist enabled/disabled state

## Affected Files
- `lib/services/panel_preferences.dart`
- `lib/pages/panel/panel_page.dart`
- `lib/services/tray_service.dart`
- `lib/services/sticky_note_window_manager.dart`
