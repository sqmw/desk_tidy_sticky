# Desk Tidy Sticky

> 📝 **Cross-platform minimal multifunction sticky notes** — capture ideas fast, never lose inspiration

[🇨🇳 中文](README.md) | **🇬🇧 English**

## ✨ Features

### Compact Mode (Main Panel / Stickies)

- **Instant access**: global shortcut `Ctrl + Shift + N`, tray icon toggle
- **Minimal UI**: frosted glass look, scroll to adjust opacity
- **Notes management**: active / archived / trash, supports Pinyin search
- **Swipe actions**: swipe left to delete, right to archive/restore (parity with Flutter)
- **Drag reorder**: manual sort mode supports drag-and-drop
- **Pin / Attach to desktop**: pinned notes can toggle topmost or bottom layer
- **Autostart**: enable startup launch in settings
- **Show on launch**: choose whether to show the main window on startup
- **Single instance**: repeated launches activate the existing window
- **Quick actions**: `Ctrl + Enter` save and pin, `Esc` hide panel

### Workspace Mode

- **Unified workspace**: notes, tasks, and focus in one window
- **Multi-view notes**: All / Todo / Quadrant / Archived / Trash
- **Tags & search**: tag filters, search bar, right-side detail editor
- **Focus timer**: task planning, focus timing, summary stats
- **Break control**: independent reminders, short/long breaks, break overlay
- **Display & theme**: presets, custom CSS, zoom, font size

See module split and layout details at: `docs/product/2026-03-29-tauri-modes-overview.md`

## ⌨️ Shortcuts

| Shortcut | Action |
|---------|--------|
| `Ctrl + Shift + N` | Show / hide main panel |
| `Ctrl + Shift + O` | Stickies: toggle mouse interaction (click-through / interactive) |
| `Ctrl + Enter` | Save and pin to desktop |
| `Esc` | Hide panel (no save) |

## 🖼️ Screenshots

### Compact Mode

| Main | Stickies | List |
|:---:|:---:|:---:|
| ![hero](.github/screenshots/hero.png) | ![desktop](.github/screenshots/desktop_mode.png) | ![list](.github/screenshots/list_page.png) |

### Workspace Mode

| Notes | Focus | Break |
|:---:|:---:|:---:|
| ![workspace-notes](.github/screenshots/workspace_notes.webp) | ![workspace-focus](.github/screenshots/workspace_focus.webp) | ![workspace-break](.github/screenshots/workspace_break.webp) |

## 🔧 Tech Stack

- **Framework**: Tauri 2 + SvelteKit
- **Backend**: Rust
- **Storage**: local JSON

## 📦 Development

```bash
# install deps
pnpm install

# dev
pnpm tauri dev

# build
pnpm tauri build
```

## 📂 Data Migration

Flutter/Dart migration: on Windows, the app will scan legacy `notes.json` paths and merge entries by `id` into the current Tauri dataset. Corrupt or old-format entries are skipped without breaking current notes. Supported legacy paths include `%APPDATA%\desk_tidy_sticky\notes.json`, `%APPDATA%\com.example\desk_tidy_sticky\notes.json`, historical parent variants, and `%LOCALAPPDATA%` equivalents. If auto-merge doesn’t hit, manual copy is still possible.

## 🧭 Migration Notes

- `docs/migration/2026-02-06-flutter-to-tauri.md`
- `docs/migration/2026-03-29-flutter-notes-auto-import-compat.md`

## 📄 License

MIT License
