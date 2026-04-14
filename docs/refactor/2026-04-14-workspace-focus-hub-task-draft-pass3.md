# Workspace FocusHub Task Draft 动作拆分记录

日期：2026-04-14
阶段：P2 第三小步
状态：代码完成，待真实 Tauri UI 手工回归

## S：背景

`WorkspaceFocusHub.svelte` 在完成 timer runtime 和 break overlay lifecycle 拆分后，仍然直接维护任务草稿、任务增删改、任务启动/选择和 timer settings 保存动作。这些动作会同时读写任务列表、统计、选中任务、focus runtime 和设置草稿，继续放在组件里会让后续拆 `routes/workspace/+page.svelte` 时难以判断职责边界。

## T：任务

本轮目标是抽出 task draft/action controller，保持 Svelte `$state` 所有权仍在组件内，不改变可见行为，不移动视图绑定结构。验收点是：

- 任务添加、选择、开始、删除、更新行为保持原样。
- 自定义 weekday draft 切换保持原样。
- timer settings 打开/保存行为保持原样。
- `pnpm check` 和 `git diff --check` 通过。

## A：行动

- 新增 `src/lib/workspace/pomodoro/focus-task-draft-controller.js`
  - 封装 `startTaskFocus`、`selectTask`、`removeTask`、`updateTask`、`addTask`。
  - 封装 `toggleDraftWeekday`。
  - 封装 `saveTimerConfig`、`openTimerSettings`、`toggleTimerSettings`。
- 更新 `src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 增加 `setDraftState(patch)` 作为 draft 写回边界。
  - 通过 `taskDraftController.*` 替代本地任务动作函数。
  - 移除组件对 `buildFocusTaskFromDraft`、`removeTaskFromState`、`updateTaskInState`、`toggleDraftWeekdayValue` 的直接依赖。

## R：结果

- `WorkspaceFocusHub.svelte` 从约 1344 行降到约 1250 行。
- 组件层继续保留 `$state` 与视图绑定；controller 只通过 getter/setter patch 编排动作。
- 本轮未改变可见 UI 或交互流程。

验证结果：

- `pnpm check`：通过，0 errors / 0 warnings。
- `git diff --check`：通过。

风险与回归关注：

- 任务删除当前选中任务时，统计结算和选中态清空需要真实 UI 复测。
- 打开并保存 timer settings 时，focus minutes 与 task start reminder 设置需要真实 UI 复测。
- command 驱动的 start/select task 路径已改为 controller 调用，需要在 workspace 任务列表入口复测。
