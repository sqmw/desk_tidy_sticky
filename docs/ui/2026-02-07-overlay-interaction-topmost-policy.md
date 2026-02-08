# 2026-02-07 Overlay Interaction Topmost Policy

## Goal
修正“置底(WorkerW)”不生效问题，确保贴纸层级由每条贴纸配置决定，而不是被全局交互状态覆盖。

## Confirmed Product Rule
1. 贴纸层级：
- 始终由每条贴纸的 `isAlwaysOnTop` 决定。  
- `false` 必须附着到 WorkerW（桌面底层）。
2. 鼠标交互按钮：
- 仅控制是否穿透（`setIgnoreCursorEvents`），不再改变贴纸层级策略。

## Backend Changes
文件：`src-tauri/src/lib.rs`

### 1) Overlay state apply
- `apply_overlay_input_state` 继续同步鼠标穿透状态；
- 层级应用函数改为忽略 `click_through` 对层级的影响，避免覆盖 `isAlwaysOnTop=false`。

### 2) Layer helper
- `apply_note_window_layer_with_interaction_by_label(...)`：
  - `is_always_on_top == true`：置顶 + 脱离 WorkerW。
  - `is_always_on_top == false`：非置顶 + 附着 WorkerW。

### 3) Global state getter
- 新增 `get_overlay_click_through(...)`，统一读取当前全局交互状态。

### 4) Layer sync/toggle integration
- `apply_note_window_layer` 改为只基于 `is_always_on_top` 分支，不看 overlay 交互状态。
- `sync_all_note_window_layers`、`toggle_z_order_and_apply` 与该规则保持一致。

## Impact
- “置底(WorkerW)”在当前版本立即生效，且能稳定保持底层。
- 全局交互按钮不再误伤层级策略，避免“明明设了置底却不在底层”。
