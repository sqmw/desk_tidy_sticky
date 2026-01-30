# Desk Tidy Sticky

Minimal sticky notes companion for the Desk Tidy family (Windows / Flutter). Fast capture with a global hotkey, tray entry, searchable list, and a desktop overlay for pinned notes.

## Features (v0.1)
- Global hotkey `Ctrl + Shift + N` to toggle the panel; `Esc` hides without saving.
- Press `Enter` to save; `Ctrl + Enter` or **Save & pin** to pin and auto-hide. Optional toggle for hiding after save.
- Separate search box (supports pinyin initials/full pinyin) with basic relevance sorting.
- Archive/unarchive notes; toggle Active/Archived view; edit notes.
- Done/pin/archive toggles and swipe actions (delete / archive).
- Tray menu: show panel, create note, open desktop overlay, exit.
- Desktop overlay (preview): pinned notes float on top, draggable with stored positions (committed on drag end), click-through toggle, edit on double click. Overlay runs as same-process multi-window on Windows.

## Run
```bash
flutter pub get
flutter run -d windows
```
FVM works too if your workspace is set up (`fvm flutter run -d windows`). The window starts hidden; use the hotkey or tray icon to show it.

## Shortcuts
- `Ctrl + Shift + N`: show/hide panel (global).
- `Enter`: save note, hide if the toggle is on.
- `Ctrl + Enter`: save and pin, then hide.
- `Esc`: hide without saving.

## Roadmap
- Hot-corner trigger parity with desk_tidy.
- Deep desktop embedding (WorkerW) as an optional experimental mode.
- Shared settings bridge from desk_tidy (launcher switch, transparency sync).

## License
Proprietary until declared otherwise.
