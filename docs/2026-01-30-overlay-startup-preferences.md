# Overlay Startup Preferences

## Requirements
- Desktop sticky overlay state should persist across restarts.
- Mouse mode should default to click-through (non-edit) on startup.

## Changes
- Added overlay preferences:
  - `overlay_enabled`
- On panel startup:
  - Load persisted overlay state
  - Force click-through default for each session
  - Auto-start overlay when enabled
- On overlay toggle:
  - Persist enabled/disabled state

## Affected Files
- `lib/services/panel_preferences.dart`
- `lib/pages/panel/panel_page.dart`
- `lib/services/tray_service.dart`
