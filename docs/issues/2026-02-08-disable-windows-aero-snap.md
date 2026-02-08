# 2026-02-08 禁用 Windows Aero Snap（主窗口 + 贴纸窗口）

## 目标
主窗口与所有贴纸窗口禁用 Windows Aero Snap，避免拖拽到边缘触发贴靠/分屏。

## 实现
### 1) Win32 层统一禁用 Snap 样式
- 文件：`src-tauri/src/windows.rs`
- 新增：`disable_aero_snap(hwnd_isize)`
- 做法：
  - 清除窗口样式中的 `WS_THICKFRAME` 与 `WS_MAXIMIZEBOX`。
  - 调用 `SetWindowPos(..., SWP_FRAMECHANGED)` 使样式立即生效。

### 2) 主窗口启动时应用
- 文件：`src-tauri/src/lib.rs`
- 在 `setup` 阶段获取 `main` 窗口句柄并执行 `disable_aero_snap`。

### 3) 每个贴纸窗口创建后应用
- 文件：`src-tauri/src/lib.rs`
- 新增命令：`apply_window_no_snap_by_label(app, label)`。

- 文件：`src/lib/panel/use-window-sync.js`
- 在贴纸窗口 `tauri://created` 事件中调用：
  - `invoke("apply_window_no_snap_by_label", { label })`

- 文件：`src/routes/+page.svelte`
- `createWindowSync` 依赖中注入 `invoke`，供窗口创建后调用后端命令。

## 验证
1. `cargo check` 通过（仅既有 warning）。  
2. `npm run check` 通过（0 errors / 0 warnings）。
