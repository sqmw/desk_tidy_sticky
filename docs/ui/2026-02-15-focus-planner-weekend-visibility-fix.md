# 2026-02-15 Focus Planner：周末任务“消失 / 添加无感”修复

## 问题现象
- 用户反馈点击“添加任务”后像卡死，且以前任务看不到。
- 复现背景日期：`2026-02-15`（周日）。

## 根因
- Focus Planner 原本展示的是“今日匹配任务”（`todayTasks`），不是全部任务。
- 新增任务默认复发规则是 `workday`，在周日会被今日过滤规则排除。
- 结果表现为：
  - 点击添加后列表不变化（误判为卡死）。
  - 历史 `workday` 任务在周末整体“消失”（实际仍在数据里）。

## 修复策略
1. 当今日匹配为空但总任务不为空时，Planner 自动回退展示“全部任务”。
2. 新建任务默认复发规则由 `workday` 改为 `none`，避免新增后立刻被过滤。
3. Planner 头部增加提示文案，明确当前是“展示全部任务（今日无匹配）”。
4. “当前专注任务”下拉与 Planner 使用同一套可选任务源，避免“面板可见但下拉不可改”。

## 代码变更
- `src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 新增 `plannerTasks` / `plannerShowingAllTasks` 及对应统计派生。
  - `WorkspaceFocusPlanner` 改为接收回退后的任务列表。
  - `draftRecurrence` 默认值改为 `RECURRENCE.NONE`。
  - Follow-up：`timerTaskOptions` 与 `selectedTask` 改为基于统一的 `focusSelectableTasks` 计算。
- `src/lib/components/workspace/focus/WorkspaceFocusPlanner.svelte`
  - `draftRecurrence` 默认值改为 `"none"`。
  - 根据 `showingAllTasks` 显示提示文案和“今日匹配数”。
- `src/lib/strings.js`
  - 新增：
    - `workspacePlannerShowingAllHint`
    - `workspacePlannerTodayMatched`

## 验证
- `npm run check`：通过（0 errors / 0 warnings）
- `cargo check`：通过（仅历史 warning）
