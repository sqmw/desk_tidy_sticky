# Workspace Focus Hub 视图层拆分 Pass 4

日期：2026-04-14  
范围：`src/lib/components/workspace/WorkspaceFocusHub.svelte` 与 `WorkspaceFocusHubView.svelte`

## 背景
- `WorkspaceFocusHub.svelte` 仍是前端最大组件之一，里面同时包含：
  - 番茄运行时状态；
  - 休息提醒/overlay 运行时；
  - 任务与统计派生值；
  - timer/planner/stats 的 UI 组件树与布局 CSS。
- 直接继续拆运行时 controller 风险较高，因为状态与 Svelte rune 派生值耦合较深。

## 本轮调整
- 新增：`src/lib/components/workspace/WorkspaceFocusHubView.svelte`
  - 承接 timer / planner / settings / stats 的组件树；
  - 承接 focus hub 的布局 CSS；
  - 通过 bindable props 暴露草稿、配置面板、统计展开、休息面板等 UI 状态。
- 调整：`WorkspaceFocusHub.svelte`
  - 保留运行时状态、派生值、任务/休息/通知/overlay 事件函数；
  - 通过 `WorkspaceFocusHubView` 传入表现层所需数据与事件。

## 当前边界
- `WorkspaceFocusHub.svelte`：运行时编排层。
- `WorkspaceFocusHubView.svelte`：表现层与布局层。
- `workspace/pomodoro/*`：番茄领域规则与 runtime helper。
- `workspace/break-control/*`：休息提醒、overlay 与通知 helper。

## 结果
- `WorkspaceFocusHub.svelte` 从约 `1701` 行降到约 `1516` 行。
- 视图与样式约 `332` 行进入独立组件，为后续继续拆 runtime controller 留出更清晰入口。

## 验证
- 已执行：
  - `pnpm check`
- 结果：
  - `svelte-check found 0 errors and 0 warnings`

