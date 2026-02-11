# Workspace 左侧今日截止任务溢出修复

日期：2026-02-10  
范围：`WorkspaceSidebar` 左侧「今日截止任务」区域

## 问题
- 当截止任务数量较多时，侧栏内容超出可视区域；
- 任务卡片下半部分会被截断，操作按钮不可见或难点。

## 处理方案
- 将 `deadline-block` 设为侧栏中的弹性区块（`flex: 1 1 auto`）；
- 将 `deadline-list` 设为可伸缩滚动容器（`min-height: 0; flex: 1 1 auto; overflow: auto;`）；
- 保留侧栏底部设置区，不让其被任务列表挤走。

## 结果
- 截止任务过多时只在该区域内部滚动；
- 卡片内容与按钮不再被截断；
- 侧栏整体布局稳定，不影响其他模块显示。

## 涉及文件
- `src/lib/components/workspace/WorkspaceSidebar.svelte`

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`
