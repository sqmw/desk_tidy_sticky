# Workspace 设置补充：显示缩放入口（2026-02-11）

## 背景
- 侧栏设置已有语言、桌面贴纸开关、鼠标交互。
- 高分辨率场景下，用户需要直接调整界面可读性（字体/整体显示大小）。

## 本次改动
- 在工作台左侧 `设置` 区新增 `显示缩放` 选项（90/100/110/125/140%）。
- 使用 Tauri WebView 的 `setZoom` 实现整体缩放，避免只改局部字体导致布局不一致。
- 缩放值持久化到偏好，重启后自动恢复。

## 代码位置
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
  - 新增显示缩放下拉框和回调。
- `src/routes/workspace/+page.svelte`
  - 新增 `workspaceZoom` 状态与 `setWorkspaceZoom` 逻辑。
  - 在加载偏好后自动应用缩放。
- `src/lib/workspace/preferences-service.js`
  - 新增 `normalizeWorkspaceZoom` 与读取字段 `workspaceZoom`。
- `src-tauri/src/preferences.rs`
  - 新增偏好字段 `workspace_zoom`（默认 `1.0`）。

## 用户收益
- 高分辨率下无需改系统缩放即可直接在应用内调节可读性。
- 设置入口与原有贴纸开关并列，符合“常用设置就近可达”的交互习惯。
