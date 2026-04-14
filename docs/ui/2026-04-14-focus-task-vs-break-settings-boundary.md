# 番茄任务设置与休息控制边界调整

日期：2026-04-14
状态：已完成

## S：背景

原先 workspace 里的“编辑设置”展开区同时放了：

- 单个番茄时长
- 任务开始提醒
- 提前提醒分钟数

这会让用户误以为这块既像任务设置，又像休息设置；而实际 `休息控制` 已经独立负责小休/长休的间隔和时长。

## T：任务

本轮目标是把三类配置按职责分开：

- 番茄时长：属于番茄钟全局参数
- 任务开始提醒：属于任务规划辅助能力
- 休息节奏：属于休息控制

## A：行动

- 更新 `src/lib/components/workspace/pomodoro/WorkspaceFocusSettingsPanel.svelte`
  - 移除“单个番茄时长”
  - 仅保留任务开始提醒与提前提醒
- 更新 `src/lib/components/workspace/pomodoro/WorkspaceFocusTimer.svelte`
  - 在 timer 卡片内新增番茄时长调节入口
- 更新 `src/lib/components/workspace/pomodoro/TargetPomodoroInput.svelte`
  - 增加 `onCommit` 回调，支持即时应用数值
- 更新 `src/lib/components/workspace/WorkspaceFocusHubView.svelte`
  - 透传 `focusMinutes` 与 `onApplyFocusMinutes`
- 更新 `src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 将番茄时长应用接到 `focusTimerController.applyFocusPreset`

## R：结果

- 任务规划设置现在只负责“任务开始提醒”。
- 番茄时长从任务规划里移出，放到番茄钟卡片本身。
- 休息控制继续只负责休息节奏，不再和任务设置混在一起。
