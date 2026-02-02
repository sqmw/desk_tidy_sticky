# Memory Optimization: Deferred Imports & Startup Cleanup

## Context
Use reported high memory usage (~17.8MB increase per sticky note window).
Investigation revealed that `desk_tidy_sticky` uses `desktop_multi_window`, meaning each sticky note is a separate Flutter Engine instance with its own memory overhead.

## Solution

To mitigate the memory footprint without re-architecting (e.g. to a single-window renderer), we implemented two optimizations:

### 1. Deferred Imports in `main.dart`
Flutter compiles code into a single executable segment. By default, all imported libraries are loaded.
We changed `PanelPage` and `OverlayPage` to be `deferred` imports.

**Benefits:**
- **Code Splitting**: The compiled code for the large "Panel" UI and the "Overlay" UI is now split into separate loadable units.
- **On-Demand Loading**: When `AppConfig.mode` is `note`, `main()` does **not** call `loadLibrary()` for the Panel or Overlay.
- **Reduced Footprint**: The sticky note process (Note Window) has a smaller heap usage because it doesn't load unrelated UI code (Settings, Panel List, etc.).

### 2. Startup Logic Cleanup in `StickyNoteWindowManager`
We observed that `_kickWindow` was calling `refresh_notes` (IPC) multiple times during window initialization.
- **Optimized**: Removed redundant `refresh_notes` calls.
- **Reasoning**: `NoteWindowPage` already loads its data in `initState`. The redundant calls forced the new process to re-parse the `notes.json` file immediately after startup, wasting CPU and I/O.

## Results
- Memory usage per note should be slightly reduced (code segment size).
- Startup CPU/Disk usage reduced (fewer file reads).
