# 2026-02-07 Overlay Interaction Topmost Policy

## Goal
修正“置底(WorkerW)”不生效问题，确保贴纸层级由每条贴纸配置决定，而不是被全局交互状态覆盖。

## Confirmed Product Rule
1. 贴纸层级（Windows）：
- `isAlwaysOnTop = true`：置顶显示（脱离桌面层）。
- `isWallpaper = true`：壁纸层（WorkerW 背后，图标下层）。
- `isAlwaysOnTop = false` 且 `isWallpaper = false`：桌面层（图标上层）。
2. 壁纸层切换按钮：
- 只在 `isPinned = true` 且 `isAlwaysOnTop = false` 时显示。
- 原因：`贴到壁纸层 / 贴在图标上层` 属于“底部语义”的二级切换，不应在置顶状态下同时出现，避免用户误以为两套层级可以并行生效。
3. 鼠标交互按钮：
- 控制全局鼠标穿透（`setIgnoreCursorEvents`）。
- 不再覆盖 `isAlwaysOnTop / isWallpaper` 的层级语义。
- `isAlwaysOnTop = true` 的贴纸始终允许 hover、编辑与拖拽，不受全局鼠标交互限制。
- `desktop / wallpaper` 贴纸继续受全局鼠标交互控制。

## 2026-04-15 补充：置顶贴纸的拖动热区
- 根因：之前实现虽然放开了 `isAlwaysOnTop = true` 的 hover / 编辑权限，但拖动入口仍主要依赖 `.preview-text` 或 `.toolbar`，导致“设计允许拖动，实际热区过窄”。
- 收敛规则：
  - 置顶贴纸在预览态下，整个便笺的非交互区域都可以直接拖动。
  - 置顶贴纸在编辑态下，除 `textarea`、标签编辑区、命令面板、颜色/透明度/磨砂面板等交互控件外，其余非交互区域仍可拖动。
  - 非置顶的桌面层 / 壁纸层贴纸继续沿用旧策略，不因为这次修复放大误触范围。
- 结果：
  - 置顶贴纸不再需要通过“反复拉伸窗口边缘”这种间接方式挪位置。
  - 全局鼠标交互关闭时，置顶贴纸仍然保留直接拖动能力，符合“置顶即可单贴纸交互”的产品预期。

## Backend Changes
文件：`src-tauri/src/lib.rs`

### 1) Overlay state apply
- `apply_overlay_input_state` 继续同步鼠标穿透状态；
- 层级应用函数改为忽略 `click_through` 对层级的影响，避免覆盖 `isAlwaysOnTop=false`。

### 2) Layer helper
- `apply_note_window_layer_with_interaction_by_label(...)`：
  - `is_wallpaper == true`：强制走壁纸层（WorkerW 背后），并保持不可交互。
  - `is_always_on_top == true`：置顶 + 脱离桌面层。
  - `is_always_on_top == false`：桌面层（图标上层）。

### 3) Global state getter
- 新增 `get_overlay_click_through(...)`，统一读取当前全局交互状态。

### 4) Layer sync/toggle integration
- `apply_note_window_layer`、`sync_all_note_window_layers`、`toggle_z_order_and_apply` 增加 `isWallpaper` 分支。

## Impact
- “置底(WorkerW)”在当前版本立即生效，且能稳定保持底层。
- 全局交互按钮不再误伤层级策略，避免“明明设了置底却不在底层”。
- 置顶贴纸在全局鼠标交互关闭时仍可直接编辑，不需要额外切换批量交互模式。
- 当贴纸处于底部 click-through 或壁纸层时，用户不会再看到误导性的 hover 编辑按钮。
