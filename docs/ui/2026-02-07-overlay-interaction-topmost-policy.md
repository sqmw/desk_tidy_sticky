# 2026-02-07 Overlay Interaction Topmost Policy

## Goal
修正“置底(WorkerW)”不生效问题，确保贴纸层级由每条贴纸配置决定，而不是被全局交互状态覆盖。

## Confirmed Product Rule
1. 贴纸层级（Windows）：
- `isAlwaysOnTop = true`：置顶显示（脱离桌面层）。
- `isWallpaper = true`：壁纸层（WorkerW 背后，图标下层）。
- `isAlwaysOnTop = false` 且 `isWallpaper = false`：桌面层（图标上层）。
2. 鼠标交互按钮：
- 控制鼠标穿透（`setIgnoreCursorEvents`）。
- 当交互为“可点”时，默认将贴纸提升到顶层（便于操作），**但不覆盖 `isWallpaper = true`**。

## Backend Changes
文件：`src-tauri/src/lib.rs`

### 1) Overlay state apply
- `apply_overlay_input_state` 继续同步鼠标穿透状态；
- 层级应用函数改为忽略 `click_through` 对层级的影响，避免覆盖 `isAlwaysOnTop=false`。

### 2) Layer helper
- `apply_note_window_layer_with_interaction_by_label(...)`：
  - `is_wallpaper == true`：强制走壁纸层（WorkerW 背后），并保持不可交互。
  - `is_always_on_top == true`：置顶 + 脱离桌面层。
  - `is_always_on_top == false`：桌面层（图标上层），如交互打开会临时浮到上层。

### 3) Global state getter
- 新增 `get_overlay_click_through(...)`，统一读取当前全局交互状态。

### 4) Layer sync/toggle integration
- `apply_note_window_layer`、`sync_all_note_window_layers`、`toggle_z_order_and_apply` 增加 `isWallpaper` 分支。

## Impact
- “置底(WorkerW)”在当前版本立即生效，且能稳定保持底层。
- 全局交互按钮不再误伤层级策略，避免“明明设了置底却不在底层”。
