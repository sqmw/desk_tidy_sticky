# 2026-03-27 Workspace 今日任务分布改为 24 小时时间线

## 判定
- 类型：`设计收敛`
- 原因：原统计区“今日任务分布”使用 Top 列表，只能看到任务名和番茄数，无法表达任务在一天中的时间位置、空档与冲突；和“任务是按时间串行安排”的产品心智不一致。

## 新设计
1. 将“今日任务分布”从列表改为 `24 小时横向时间线`。
2. 每个任务以时间块展示：
   - 左右位置对应开始/结束时间
   - 条块长度对应任务时长
   - 条块文案包含：任务名、时间段、已完成番茄数
3. 当前时间用一根竖线标记。
4. 如果任务有时间重叠，不强行压在一条线上，而是自动分轨展示。

## 代码变更

### 新增组件
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceTaskTimeline.svelte`

职责：
1. 接收当天任务分布数据与当前时间。
2. 根据 `startMinutes / endMinutes` 计算条块位置与宽度。
3. 自动分配轨道，避免任务重叠时遮挡。
4. 渲染 24 小时刻度、辅助网格与当前时间线。

### 数据层调整
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-runtime.js`

调整：
1. `buildTodaySummary(...)` 的 `taskDistribution` 从“按番茄数排序的 Top 列表”改为“按开始时间排序的完整任务列表”。
2. 每个条目补充：
   - `startTime`
   - `endTime`
   - `startMinutes`
   - `endMinutes`
   - `pomodoros`

### 编排层调整
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusStats.svelte`

调整：
1. `WorkspaceFocusHub` 新增 `currentMinutes` 派生值，传给统计组件。
2. `WorkspaceFocusStats` 不再自己渲染任务列表，改为挂载 `WorkspaceTaskTimeline`。

## 行为结果
1. 用户能直接看出任务在 24 小时内的分布，而不是只看到一个 Top 排名。
2. 上午/下午/晚间任务的排布、空档和冲突更直观。
3. 当前时间在时间轴中的位置也一眼可见。

## 回归验证
1. 进入工作台 -> 专注 -> 统计。
2. 确认“今日任务分布”显示为带刻度的横向时间线，而不是列表。
3. 确认任务条块位置与 `开始时间/结束时间` 一致。
4. 确认当前时间竖线正常显示。
5. 构造两个时间重叠任务，确认会自动分成两条轨道而不是互相覆盖。
