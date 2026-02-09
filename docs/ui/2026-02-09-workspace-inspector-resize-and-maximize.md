# Workspace 详情区布局与放大能力优化（2026-02-09）

## 目标
根据最新反馈优化 workstation：
1. 详情区分栏不固定，支持拖动调整；
2. 查看/编辑流程保持统一且更符合复杂场景；
3. 提供完整放大能力（面板放大 + 窗口最大化）。

## 本次改动

### 1) 详情分栏可拖拽
- 在主列表与详情区之间增加 `inspector-splitter` 拖拽条；
- 支持按住拖动实时调整详情区宽度；
- 双击分割条恢复默认宽度（430px）；
- 约束范围：最小 340px，最大约主区宽度 78%。

### 2) 查看/编辑统一交互增强
- 仍保持“同一详情面板查看/编辑”；
- 增加详情面板 `放大/还原分栏` 按钮；
- 放大后主列表隐藏，详情区独占主内容区域，适合长文查看与编辑。

### 3) 窗口级放大能力
- 顶部 window bar 增加 `最大化/还原` 按钮；
- 调用 Tauri 窗口 API `toggleMaximize` + `isMaximized` 同步状态。

## 影响文件
- `src/routes/workspace/+page.svelte`
- `src/lib/components/workspace/WorkspaceWindowBar.svelte`
- `src/lib/components/workspace/WorkspaceNoteInspector.svelte`
- `src/lib/strings.js`

## 结果
- 详情区位置不再“固定死”；
- 用户可按内容复杂度自由调整或直接放大详情；
- workspace 具备窗口级全屏/还原能力，整体更符合工作台定位。
