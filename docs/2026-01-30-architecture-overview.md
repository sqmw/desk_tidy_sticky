# Architecture Overview (Windows)

## Entry Points
- `lib/main.dart`: Initializes config, window messaging, tray/hotkeys, and routes
  to Panel or Overlay by window type.

## Core Modules
- `lib/models/*`: Core data (Note, MonitorRect, WindowArgs).
- `lib/controllers/*`: Local state signals (locale, overlay click-through, refresh).
- `lib/services/*`:
  - `notes_service.dart`: Persistence + sorting for notes.
  - `overlay_window_manager.dart`: Creates/controls overlay windows.
  - `window_message_service.dart`: Cross-window commands (refresh/close/locale).
  - `window_zorder_service.dart` / `workerw_service.dart`: Window z-order and
    WorkerW desktop attachment.
- `lib/pages/panel/*`: Main panel UI.
- `lib/pages/overlay/*`: Desktop sticky overlay UI.

## High-Level Flow
- Panel window changes notes -> `NotesService` -> broadcast refresh to overlays.
- Overlay window edits notes -> `NotesService` -> broadcast refresh to panel.
- Locale change -> `WindowMessageService` syncs all windows.

## Window Types
- Panel: normal window with tray/hotkey.
- Overlay: frameless desktop window, one per monitor per layer.
