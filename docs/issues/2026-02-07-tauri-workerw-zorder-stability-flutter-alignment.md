# 2026-02-07 Tauri WorkerW/ZOrder 稳定性修复（对齐 Flutter 方案）

## 背景问题
- 贴纸在 `置顶 <-> 贴底` 切换时不稳定，存在不下沉、延迟下沉、状态抖动。
- 面板端切换单个贴纸层级时，列表会出现整行图标闪动。
- 之前对窗口样式（`WS_CHILD/WS_POPUP`）的强改在 Tauri WebView 上风险较高，容易带来交互异常。

## 根因
1. `windows.rs` 里多轮“样式改写 + SetParent”组合过于激进，和 WebView 宿主行为冲突概率高。  
2. 层级判断没有保持 Flutter 语义：`interactive(可鼠标交互) || note.isAlwaysOnTop`。  
3. 面板本地 `toggle_z_order` 后又立刻吃到 `notes_changed` 全量刷新，触发二次重绘。

## 修复策略
### 1) WorkerW 挂载/脱离回退到“轻量 Win32 方案”
- 不再改 `WS_CHILD/WS_POPUP`。
- 挂载仅做：`SetParent(hwnd, workerw)` + `SetWindowPos(... HWND_BOTTOM, SWP_NOACTIVATE ...)`。
- 脱离仅做：`SetParent(hwnd, desktop)` + `SetWindowPos(... HWND_TOP, SWP_NOACTIVATE ...)`。
- 挂载失败时兜底：回到桌面父窗口并强制 `HWND_BOTTOM`，保证“失败也尽量在底层”。

### 2) 恢复 Flutter 一致层级语义
- 统一为：
  - `shouldBeTop = (!click_through) || is_always_on_top`
- 即：
  - 鼠标交互开启时，所有贴纸可编辑并处于上层；
  - 鼠标交互关闭时，再根据每条贴纸 `is_always_on_top` 决定顶/底。

### 3) 降低面板二次刷新闪动
- 面板在本地 `toggle_z_order` 时短时间抑制 `notes_changed` 重载。
- 仍保留正常事件链，避免影响其它功能场景。

## 影响文件
- `src-tauri/src/windows.rs`
- `src-tauri/src/lib.rs`
- `src/lib/panel/use-note-commands.js`
- `src/routes/+page.svelte`
- `src/routes/note/[id]/+page.svelte`

## 回归验证建议
1. 在面板列表切换某条贴纸 `置顶/贴底`，观察：
   - 目标贴纸层级正确变化；
   - 列表不再整页闪动。
2. 打开鼠标交互后，检查：
   - 所有贴纸可操作、可编辑；
   - 关闭交互后按各自 `isAlwaysOnTop` 回到顶/底状态。
3. 在贴纸窗口内反复切换 `置顶/贴底`，确认：
   - 不会出现明显“需要再点其它窗口才下沉”的现象；
   - 无 `SetParent ... Win32 error 87/0` 弹性失败导致功能失效。
