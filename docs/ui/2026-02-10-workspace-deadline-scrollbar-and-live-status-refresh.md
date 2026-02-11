# Workspace 今日截止任务：滚动条美化与状态自动刷新

日期：2026-02-10  
范围：工作台左侧「今日截止任务」区域

## 问题
- 深色主题下滚动条视觉较粗、边角不够细致，且出现上下箭头按钮；
- 到达时间节点后状态不会自动变化，需要手动刷新页面。

## 本次改动
### 1) 滚动条美化（deadline 列表）
- 宽度从 `8px` 调整为 `6px`；
- 隐藏 WebKit 滚动条按钮（去掉上下箭头）；
- 轨道透明化混合，滑块增加边界层，整体更轻。

### 2) 截止状态实时刷新
- 在 `workspace` 页面增加轻量时间心跳：
  - 每 `15s` 更新一次 `deadlineNowTick`；
- `deadlineTasks` 改为基于当前时间重新计算；
- 组件卸载时清理计时器，避免泄漏。

## 影响
- 用户无需手动刷新，任务会按时间自动从“待开始”切到“进行中/已超时”；
- 滚动条视觉更贴合当前主题和面板风格。

## 涉及文件
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
- `src/routes/workspace/+page.svelte`

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`
