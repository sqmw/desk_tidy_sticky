# 工作台左侧“今日截止任务”交互升级（2026-02-10）

## 问题
1. 列表仅展示，不可操作，用户无法从左侧直接跳转处理任务。
2. 排序偏向“截止剩余”，与“今日时间安排”阅读习惯不一致。

## 调整
1. 改为按任务开始时间排序（`startTime` 升序）。
2. 列表项改为可点击操作：
   - 点击后切换到番茄模块；
   - 并自动选中对应任务。
3. 状态文案细化：
   - 未开始：`开始于 Xm`
   - 进行中：`剩余 Xm`
   - 已超时：`已超时 Xm`

## 实现文件
1. `src/lib/workspace/focus/focus-deadlines.js`
2. `src/lib/components/workspace/WorkspaceSidebar.svelte`
3. `src/routes/workspace/+page.svelte`
4. `src/lib/components/workspace/WorkspaceFocusHub.svelte`
5. `src/lib/strings.js`

## 验证
1. 点击左侧任务能进入番茄页并同步选中任务。
2. 列表排序按开始时间展示，符合日程阅读顺序。
