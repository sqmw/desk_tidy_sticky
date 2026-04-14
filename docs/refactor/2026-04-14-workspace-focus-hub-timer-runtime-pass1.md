# Workspace FocusHub Timer Runtime 拆分记录

日期：2026-04-14
阶段：P2 第一小步
状态：代码完成，待真实 Tauri UI 手工回归

## 背景

`WorkspaceFocusHub.svelte` 同时承载番茄钟运行时状态、任务计时、休息提醒、overlay 同步和视图装配。上一轮已经拆出 `WorkspaceFocusHubView.svelte` 表现层，但运行时动作仍集中在组件脚本里，导致后续继续调整 break/task 逻辑时改动面偏大。

本轮优先抽出 timer runtime controller，不改变可见行为，只降低大组件对缓存恢复、持久化和开始/暂停动作的直接负责范围。

## 改动范围

- 新增 `src/lib/workspace/pomodoro/focus-timer-controller.js`
  - 负责 timer runtime cache 恢复。
  - 负责 timer runtime cache 持久化与清理判定。
  - 负责开始/暂停、重置当前阶段、应用 focus preset 的动作封装。
- 更新 `src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 保留 Svelte 状态所有权。
  - 通过 `setTimerRuntime(patch)` 作为 controller 写回边界。
  - 将 `restoreTimerRuntimeFromCache`、`persistTimerRuntimeToCache`、`toggleRunning` 调用切换为 `focusTimerController.*`。

## 架构边界

`focus-timer-controller.js` 不直接持有 Svelte `$state`，也不直接 import 组件。它通过 getter 读取当前运行时状态，通过 `setTimerRuntime` 写回 patch，从而保持：

- 组件仍是 UI 状态装配层。
- controller 只负责 timer runtime 动作编排。
- cache helper 仍留在 `focus-timer-runtime-cache.js`。
- runtime snapshot/restore 判定仍复用 `focus-runtime-controller.js`。

## 行为约束

本轮不改变以下可见行为：

- 开始/暂停当前 focus timer。
- 选择任务后的任务计时启动。
- 暂停时按当前 settle 时间结算任务 session。
- 刷新后从 timer runtime cache 恢复运行时。
- 无有效 runtime 时清理 cache。

## 验证

- `pnpm check`：通过，0 errors / 0 warnings。

## 回归关注

- 开始/暂停按钮是否仍能正确切换 focus timer。
- 选中任务后开始 focus，任务计时是否仍自动激活。
- 刷新 workspace 后，正在运行或已开始的 timer 是否按 cache 恢复。
- 休息结束后自动恢复 focus 的路径是否仍能调用 timer toggle。
- 后续拆 `break overlay lifecycle` 前，需要避免把 overlay 状态写回混入 timer controller。
