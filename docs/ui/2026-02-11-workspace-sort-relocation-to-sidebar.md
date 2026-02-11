# Workspace 排序入口位置调整（2026-02-11）

## 问题

排序放在顶部右侧（靠近搜索）时，与“视图/标签筛选”分组割裂，用户不容易建立稳定心智。

## 调整

将排序入口迁移到左侧“视图”区，与“初始视图”同组：

1. 顶部工具栏仅保留搜索输入。
2. 左侧在“初始视图”下新增“排序”选择器（手动/最新/最早）。
3. 排序与视图、标签筛选形成同一过滤工作流。

## 涉及文件

- `src/lib/components/workspace/WorkspaceQueryBar.svelte`
- `src/lib/components/workspace/WorkspaceToolbar.svelte`
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
- `src/routes/workspace/+page.svelte`
