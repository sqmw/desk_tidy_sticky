# 2026-02-07 Z-Order Toggle Flicker And Delayed Sink

## Problem
1. 将某条贴纸从置顶切到置底时，列表里所有图标会闪动。  
2. 置底后窗口不会立刻下沉，通常要点击其他窗口才明显生效。

## Root Cause
- 前端 `toggleZOrder` 每次都 `loadNotes()`，触发全量刷新，导致整表重渲染闪动。  
- Win32 下沉路径用了 `SWP_NOACTIVATE`，会保留当前激活态，窗口下沉表现延迟。

## Fix
### Frontend
- `src/lib/panel/use-note-commands.js`
  - `toggleZOrder` 改为使用命令返回值直接更新 `notes`，不再全量 `loadNotes()`。
  - 保留 `syncWindows()` 以同步窗口集合。

### Backend (Windows)
- `src-tauri/src/windows.rs`
  - `attach_to_worker_w` 底层定位时去掉 `SWP_NOACTIVATE`。
  - `set_topmost_no_activate(false)` 时也去掉 `SWP_NOACTIVATE`，让窗口更快退出前景层。

## Expected Result
- 点击单条置顶/置底，仅该条状态变化，不再全列表闪动。
- 从置顶切置底后，窗口无需额外点击其他窗口即可更快下沉。
