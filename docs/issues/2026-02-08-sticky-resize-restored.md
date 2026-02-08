# 2026-02-08 恢复贴纸可调整大小

## 需求
贴纸窗口需要支持用户手动调整大小（恢复历史体验）。

## 调整
### 1) 贴纸窗口创建参数恢复可缩放
- 文件：`src/lib/panel/use-window-sync.js`
- 变更：
  - `resizable: true`
  - `maximizable: false`

### 2) 贴纸禁用 Snap 策略改为“保留可缩放边框”
- 文件：`src-tauri/src/windows.rs`
- 新增：`disable_aero_snap_keep_resizable(hwnd)`
  - 仅去掉 `WS_MAXIMIZEBOX`
  - 保留 `WS_THICKFRAME`，确保仍可通过窗口边缘调整尺寸

- 文件：`src-tauri/src/lib.rs`
- `apply_window_no_snap_by_label` 按窗口类型分流：
  - `main`：继续使用 `disable_aero_snap`（彻底禁用 Snap）
  - `note-*`：使用 `disable_aero_snap_keep_resizable`

## 验证
1. `cargo check` 通过（仅既有 warning）。  
2. `npm run check` 通过（0 errors / 0 warnings）。
