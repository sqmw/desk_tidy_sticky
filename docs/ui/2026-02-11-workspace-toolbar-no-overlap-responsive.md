# Workspace 顶部工具栏窄宽度不重叠修复（2026-02-11）

## 问题

工作台窗口较窄时，创建栏新增了“优先级选择”后，`新建笔记` 与 `搜索` 区域发生挤压重叠，导致操作区视觉与点击区域错乱。

## 根因

- 顶部工具栏采用双列网格。
- 创建栏内部是固定三列（输入 + 标签 + 按钮组）。
- 当单列可用宽度不足时，创建栏内容横向溢出，压到右侧查询列。

## 修复策略

1. 创建栏改为 `flex + wrap`，不足宽度自动换行，不再横向溢出。
2. 查询栏改为 `flex + wrap`，搜索框与排序器在窄宽度下自适应折行。
3. 顶部双列断点提前（`1180px`），减少中等宽度下拥挤风险。

## 修改文件

- `src/lib/components/workspace/toolbar/WorkspaceCreateBar.svelte`
- `src/lib/components/workspace/toolbar/WorkspaceQueryBar.svelte`
- `src/lib/components/workspace/WorkspaceToolbar.svelte`

## 结果

- 窗口缩小时不再出现“新建按钮与搜索栏叠在一起”。
- 保留桌面宽度下的一行效率布局。
- 中小宽度自动过渡为可读、可点、可操作布局。

## 验证

- `npm run check`：通过（0 error / 0 warning）
- `cargo check`：通过（仅历史 dead_code 警告）
