# 2026-02-20 面板窗口互斥与启动恢复修复

## 背景问题
1. 从简洁模式切到工作台后，偶发出现两个主面板窗口共存。
2. 重启应用后未按 `lastPanelWindow` 恢复，仍默认显示简洁窗口。

## 根因判定
- 判定：`Bug/回归`
- 依据：
  - 前端切窗逻辑存在“等待 ready 再隐藏当前窗口”的历史路径，时序抖动时会留下旧窗口。
  - 后端 `show_preferred_panel_window` 只在 `workspace` 已存在时才可显示；冷启动时只有 `main` 初始窗口，导致无法按偏好恢复 `workspace`。

## 方案
### 1) 前端切窗改为强互斥（立即切换）
- 文件：`src/lib/panel/switch-panel-window.js`
- 要点：
  - 切到 `workspace`：先 `show/focus` 目标，再立即隐藏当前窗口；并补一层 `main/workspace` 互斥隐藏兜底。
  - 切到 `main`：同样执行互斥隐藏。
  - 保持 `lastPanelWindow` 持久化写回。

### 2) 后端支持“按需创建 workspace 后再恢复”
- 文件：`src-tauri/src/lib.rs`
- 新增：
  - `ensure_workspace_panel_window(app)`：当 `workspace` 不存在时，通过 `WebviewWindowBuilder` 按统一参数创建。
- 调整：
  - `show_preferred_panel_window(app)` 在偏好为 `workspace` 时改为调用 `ensure_workspace_panel_window`，保证冷启动也能恢复。
  - `setup` 启动分支中：
    - `show_panel_on_startup = true` 时调用 `show_preferred_panel_window`。
    - `show_panel_on_startup = false` 时同时隐藏 `main/workspace`，避免残留显示。

## 验证
1. `npm run check`：通过（0 errors / 0 warnings）。
2. `cargo check`：通过（仅既有 dead_code warning）。

## 影响与兼容
- 不改变偏好字段结构，沿用 `lastPanelWindow`。
- tray/single-instance/启动显示路径统一走“偏好窗口优先”逻辑，减少路径分叉。
