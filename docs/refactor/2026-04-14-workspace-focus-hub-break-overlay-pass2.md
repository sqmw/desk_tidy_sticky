# Workspace FocusHub Break Overlay 生命周期拆分记录

日期：2026-04-14
阶段：P2 第二小步
状态：代码完成，待真实 Tauri UI 手工回归

## 背景

`WorkspaceFocusHub.svelte` 中的休息 overlay 生命周期逻辑包含窗口创建、label 去重、payload key 去重、queued sync、关闭全屏 overlay 等细节。这些细节和 UI 状态展示关系不强，却长期占据组件脚本区域，增加后续调整休息提醒和任务计时的认知成本。

本轮将 overlay 生命周期状态迁入独立 helper，让组件只保留“休息是否激活”和“如何构造 payload”的装配责任。

## 改动范围

- 新增 `src/lib/workspace/break-control/break-overlay-lifecycle.js`
  - 管理 overlay labels。
  - 管理 ensure promise、sync in-flight、queued sync。
  - 管理 payload key 去重。
  - 管理 overlay close 与 presentation 复位。
  - 管理 overlay ready 后的单窗口同步。
- 更新 `src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 移除 overlay lifecycle 本地状态。
  - 移除 `ensureBreakOverlayLabels`、`syncBreakOverlay`、`closeBreakOverlayEverywhere` 本地实现。
  - 通过 `breakOverlayLifecycle.syncActiveState()`、`sync()`、`closeEverywhere()`、`handleReady()` 触发 overlay 生命周期动作。

## 架构边界

`break-overlay-lifecycle.js` 内部持有 overlay 窗口生命周期状态，但不持有 Svelte `$state`。它通过：

- `getBreakTimerActive()` 判断是否应该继续同步。
- `buildPayload()` 延迟读取组件当前 payload。
- `focus-break-overlay-windows.js` 执行 Tauri overlay 窗口操作。
- `break-control-controller.js` 复用 payload key 构建逻辑。

这样组件层仍负责休息业务状态，helper 只负责 overlay 窗口生命周期和同步节流。

## 行为约束

本轮不改变以下可见行为：

- 休息开始时创建或复用 fullscreen overlay。
- 休息倒计时、strict mode、postpone/skip 状态变更时同步 overlay payload。
- overlay ready 后立即同步当前 payload。
- 休息结束、倒计时归零或组件销毁时关闭 overlay。
- sync in-flight 时合并后续同步请求。

## 验证

- `pnpm check`：通过，0 errors / 0 warnings。
- `git diff --check`：通过。

## 回归关注

- mini break / long break 到点后 fullscreen overlay 是否仍能出现。
- overlay 上 postpone / skip 后主界面状态是否仍同步。
- strict mode 下 postpone / skip 是否仍禁用。
- 休息倒计时结束后 overlay 是否能关闭并恢复 presentation。
- 多显示器 overlay label 回收是否仍健康。
