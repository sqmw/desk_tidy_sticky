# Workspace 设置升级：显示缩放自适应 + 字体大小（2026-02-11）

## 背景
- 原设置只有固定缩放百分比，不支持“自适应”。
- 用户在高分辨率场景下需要可读性控制，单纯缩放不足以覆盖所有阅读场景。

## 本次改动
- 显示缩放新增 `自适应` 选项，策略按窗口宽度动态计算并在窗口尺寸变化时实时更新。
- 新增 `字体大小` 设置：`小 / 标准 / 大`。
- 字体大小仅作用于 **App 界面层**（侧栏、窗口栏、工具栏及主要控件），不改动笔记正文/编辑器内容字体。

## 持久化
- 新增偏好字段并持久化：
  - `workspaceZoomMode`（`auto` / `manual`）
  - `workspaceFontSize`（`small` / `medium` / `large`）

## 代码位置
- `src/routes/workspace/+page.svelte`
  - 新增自适应缩放策略、模式切换、窗口 resize 响应、界面字体大小状态。
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
  - 设置区新增“显示缩放（含自适应）”和“字体大小（界面）”。
- `src/lib/workspace/preferences-service.js`
  - 新增 `normalizeWorkspaceZoomMode`、`normalizeWorkspaceFontSize`。
- `src-tauri/src/preferences.rs`
  - 新增偏好字段：`workspace_zoom_mode`、`workspace_font_size`。
