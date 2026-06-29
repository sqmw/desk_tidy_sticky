# 2026-06-29 Workstation UI Cleanup

## Situation

workstation 当前的主要问题不是功能不足，而是视觉层级和信息密度偏硬：侧边栏框感太强，主区域顶部占位偏重，卡片操作常驻导致浏览态噪音高。

本轮按用户明确方向重做，不碰右上角设置入口，不改便笺块编辑模型。

## Task

- 左下角保留两个高频开关，常驻可见。
- 侧边栏去掉多余框和内部小滚动感。
- 顶部创建和搜索尽量轻量化。
- 卡片操作默认隐藏，hover / focus 再出现。

## Action

- `WorkspaceSidebar.svelte`
  - 底部改回两个常驻按钮式开关。
  - 去掉“设置”折叠入口。
  - 弱化块边框和内部分割感。
- `WorkspaceSidebarNoteFilters.svelte`
  - 去掉初始视图下拉，只保留视图和标签筛选。
- `WorkspaceToolbar.svelte`
  - 调整顶部两栏比例和断点，让创建 / 搜索更轻。
- `WorkspaceCreateBar.svelte`
  - 保留创建按钮，但减少它的压迫感。
- `WorkbenchSection.svelte`
  - 去掉重复摘要 chips。
- `WorkbenchNoteGrid.svelte`
  - 卡片固定行高，正文限制预览行数。
  - 卡片操作区改为 hover / focus 浮层。

## Result

- `pnpm check` 通过。
- `git diff --check` 通过。
- 当前未提交，等待用户在真实界面确认。

