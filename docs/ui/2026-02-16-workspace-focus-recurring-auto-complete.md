# 2026-02-16 专注任务：周期任务自动完成（移除手动勾选）

## 2026-03-27 状态更新
- 该能力已退役。
- 原因：`目标番茄数` 已整体下线，`达到目标即完成` 的规则随之失效。
- 当前专注任务不再有“自动完成”概念，也不会因为完成若干番茄而从今日任务/截止任务中自动隐藏。
- 当前有效实现请参考：
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/docs/ui/2026-03-27-workspace-focus-target-pomodoro-removal.md`

## 背景
- 现有 `专注任务规划` 行内有复选框，依赖手动勾选完成。
- 对周期性任务（每天/工作日/自定义重复）而言，手动勾选不符合使用心智。
- 用户预期是：达到目标番茄数后，任务当天自动视为完成。

## 本次调整
1. 移除 Planner 行内手动复选框 UI。
2. 完成判定改为自动规则：
   - `donePomodoros >= targetPomodoros` 即为“当天已完成”。
3. 今日任务（左侧截止/任务面板）过滤规则同步改为自动完成判定。
4. 今日统计里的“完成数”同步改为自动完成判定。

## 代码变更
- `src/lib/components/workspace/focus/WorkspaceFocusPlannerTaskItem.svelte`
  - 删除复选框与 `onToggleTaskDone` 交互入口。
  - 保留番茄进度显示（`🍅 done/target`）。

- `src/lib/components/workspace/focus/WorkspaceFocusPlanner.svelte`
  - 删除 `onToggleTaskDone` 透传链路。
  - 删除 `completed` 入参传递。

- `src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 删除手动勾选处理函数与回调绑定。
  - `plannerCompletedCount` 改为按自动完成规则计算。

- `src/lib/workspace/focus/focus-runtime.js`
  - 新增 `isFocusTaskCompleted(task, todayStats)`。
  - `buildTodaySummary` 改为基于该函数计算 `completedCount`。
  - 删除不再使用的 `toggleTaskDoneInStats`。

- `src/lib/workspace/focus/focus-deadlines.js`
  - 今日任务过滤改为调用 `isFocusTaskCompleted`，不再依赖 `completedTaskIds`。

## 兼容说明
- 历史统计结构中的 `completedTaskIds` 字段保留（兼容旧数据），但新逻辑不再依赖该字段。
- 不影响既有番茄累计、任务编辑、任务删除、周期筛选逻辑。

## 验证点
1. 周期任务专注达到目标番茄后，今日任务列表自动隐藏该任务。
2. 今日统计“完成数”随番茄进度自动变化，不需要手动勾选。
3. Planner 列表无复选框，仍可正常开始/编辑/删除任务。
