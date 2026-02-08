# 2026-02-08 层级切换多次闪动修复（单次应用）

## 问题现象
1. 点击某条贴纸置顶/置底时，会看到窗口多次闪动。  
2. 切某条贴纸层级时，其他贴纸也会出现明显闪动。  
3. 开关鼠标交互时，层级调整链路重复执行，视觉抖动明显。

## 根因
1. 贴纸页 `applyZOrderAndParent` 使用重试数组（`[0, 150, 400]`），一次操作会重复触发多次层级调用。  
2. `overlay_input_changed` 与 `notes_changed` 事件里再次执行 `applyZOrderAndParent`，与后端已执行的层级切换形成重复。  
3. Win32 置底路径中存在额外重复 `HWND_BOTTOM` 调用，进一步放大闪动。

## 修复
### Frontend
- 文件：`src/routes/note/[id]/+page.svelte`
- 调整：
  - `applyZOrderAndParent` 改为单次执行，不再重试。  
  - `toggleTopmost`、`toggleMouseInteraction` 中移除重复层级调用。  
  - `overlay_input_changed`、`notes_changed` 监听中移除重复层级调用，仅保留必要状态同步。

### Backend (Win32)
- 文件：`src-tauri/src/windows.rs`
- 调整：
  - `force_bottom_immediately` 去掉重复的第二次 `HWND_BOTTOM`。  
  - `set_topmost_no_activate` 统一使用 `SWP_NOACTIVATE`，减少切换时的非目标窗口视觉抖动。

## 预期结果
1. 单条贴纸层级切换只触发一次明显变更。  
2. 非目标贴纸不再因为重复层级调用发生连带闪动。  
3. 鼠标交互切换时视觉抖动显著降低。

## 验证
1. `npm run check` 通过（0 errors / 0 warnings）。  
2. `cargo check` 通过（仅已有 warning，无新增错误）。
