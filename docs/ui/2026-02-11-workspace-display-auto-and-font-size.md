# Workspace 设置升级：显示缩放自适应 + 字体大小（2026-02-11）

## 背景
- 原设置只有固定缩放百分比，不支持“自适应”。
- 用户在高分辨率场景下需要可读性控制，单纯缩放不足以覆盖所有阅读场景。

## 本次改动
- 显示缩放新增 `自适应` 选项，策略按窗口宽度动态计算并在窗口尺寸变化时实时更新。
- 新增 `字体大小` 设置：`小 / 标准 / 大`。
- 字体大小仅作用于 **App 界面层**（侧栏、窗口栏、工具栏及主要控件），不改动笔记正文/编辑器内容字体。
- 显示缩放实现改为 **工作台容器 CSS 缩放**（`zoom` 变量），避免依赖 Tauri `set_webview_zoom` 权限导致“设置无效”。
- 修复缩放后右上角按钮溢出不可点问题：
  - 新增 `workspace-viewport` 外层容器；
  - 工作台主体使用 `transform: scale(...)`，并通过 `width/height = calc(100% / scale)` 做反向补偿，保证可点击区域始终在窗口内。

## 持久化
- 新增偏好字段并持久化：
  - `workspaceZoomMode`（`auto` / `manual`）
  - `workspaceFontSize`（`small` / `medium` / `large`）

## 代码位置
- `src/routes/workspace/+page.svelte`
  - 新增自适应缩放策略、模式切换、窗口 resize 响应、界面字体大小状态。
  - 缩放应用方式为 `--ws-app-zoom` + `.workspace { transform: scale(...) }` + 反向宽高补偿。
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
  - 设置区新增“显示缩放（含自适应）”和“字体大小（界面）”。
- `src/lib/workspace/preferences-service.js`
  - 新增 `normalizeWorkspaceZoomMode`、`normalizeWorkspaceFontSize`。
- `src-tauri/src/preferences.rs`
  - 新增偏好字段：`workspace_zoom_mode`、`workspace_font_size`。
