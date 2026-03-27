# 2026-02-16 专注任务编辑功能

## 目标
- 在 `专注任务规划` 列表中支持任务编辑，不再只能“添加/删除”。
- 保持现有 Focus 架构不变：任务状态仍由 `WorkspaceFocusHub` 统一管理并上抛持久化。

## 方案
1. 在 Planner 任务行引入“查看态/编辑态”切换。
2. 编辑态可修改以下字段：
   - 任务标题
   - 开始时间
   - 结束时间
   - 重复规则（无/每天/工作日/自定义）
   - 自定义星期（仅 `custom` 时显示）
3. 保存后通过 Hub 回调更新任务集合，保持任务 `id` 与历史统计关联不丢失。

## 2026-03-27 状态更新
- `目标番茄数` 已从专注任务模型中移除。
- 当前编辑态只保留：
  - 标题
  - 开始时间
  - 结束时间
  - 重复规则
  - 自定义星期
- 现行实现说明请参考：
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/docs/ui/2026-03-27-workspace-focus-target-pomodoro-removal.md`

## 2026-03-27 状态更新（二）：已开始任务显式高亮
- 判定：`设计收敛`
- 依据：
  - 点击任务行 `开始` 时，`WorkspaceFocusHub` 已经会更新 `selectedTaskId / running / hasStarted`。
  - 旧版 `WorkspaceFocusPlannerTaskItem` 没有消费这些运行态，所以用户只能从顶部计时器判断哪条任务正在运行。

### 行为调整
1. 任务点击 `开始` 后，该任务行会进入 `已开始` 状态。
2. `已开始` 状态会在任务标题后展示状态胶囊。
3. 任务行背景加入横向进度底纹，直接映射当前番茄倒计时进度。
4. 当前任务的主按钮改为运行态按钮：
   - 运行中：`暂停`
   - 已暂停：`继续`
   - 未开始：`开始`
5. 顶部计时卡不再提供 `暂停/重置`，任务行成为唯一运行控制入口。

### 代码落点
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 将 `selectedTaskId / hasStarted / running / 当前进度百分比` 传递到 Planner。
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusPlanner.svelte`
  - 将“当前运行任务”状态映射到对应任务行。
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusPlannerTaskItem.svelte`
  - 渲染 `已开始` 状态标签与进度底纹。

## 代码变更
- `src/lib/components/workspace/focus/WorkspaceFocusPlannerTaskItem.svelte`
  - 新增任务行组件，负责单行编辑 UI 与交互逻辑。
  - 提供 `编辑/保存/取消/删除/开始` 动作。
- `src/lib/components/workspace/focus/WorkspaceFocusPlanner.svelte`
  - 列表渲染改为使用 `WorkspaceFocusPlannerTaskItem`。
  - 新增 `onUpdateTask` 回调透传。
- `src/lib/workspace/focus/focus-runtime.js`
  - 新增 `updateTaskInState(tasks, taskId, patch)`。
  - 统一通过 `normalizeFocusTask` 归一化编辑结果，避免脏数据进入状态。
- `src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 接入 `updateTaskInState` 并实现 `updateTask(taskId, patch)`。
  - 将 `onUpdateTask` 传给 Planner，复用现有 `onTasksChange` 持久化链路。

## 关键设计点
- 编辑是“更新同一任务”，不是删除重建：
  - 任务 `id` 不变，历史番茄统计仍然挂在原 taskId 上。
- 当重复规则不是 `custom` 时，`weekdays` 自动清空，避免规则与数据不一致。

## 验证
- `npm run check`：通过（0 errors / 0 warnings）。

## 风险
- 本次未增加“时间区间合法性校验（开始 >= 结束）”的强约束，仍沿用现有输入容错策略。

## 相关文档
- `docs/ui/2026-02-16-workspace-focus-recurring-auto-complete.md`
