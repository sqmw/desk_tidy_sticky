# Workspace Route Workspace Bridge 拆分记录

日期：2026-04-14
阶段：P3 第五小步
状态：代码完成，待真实 Tauri UI 手工回归

## S：背景

在前四轮 P3 拆分后，`src/routes/workspace/+page.svelte` 里仍然保留三大块 controller 配置胶水：

- `createWorkspaceFocusActions`
- `createWorkspaceSettingsActions`
- `createWorkspaceWindowActions`

这些配置本质上都是 route 本地状态和 controller 之间的桥接，不属于页面模板本身，继续堆在入口文件里会让 route 保持高噪音。

## T：任务

本轮目标是抽出 `focus/settings/window` 三组 route bridge，进一步压缩 `+page.svelte` 的 controller 配置噪音，同时保持现有 controller 接口稳定。验收点：

- focus/settings/window 三组 controller 行为不变。
- `pnpm check` 和 `git diff --check` 通过。

## A：行动

- 新增 `src/lib/workspace/controllers/workspace-route-workspace-bridge.js`
  - 提供 `createFocusActionsConfig()`
  - 提供 `createSettingsActionsConfig()`
  - 提供 `createWindowActionsConfig()`
- 更新 `src/routes/workspace/+page.svelte`
  - 新增 `routeWorkspaceBridge`
  - 将 focus/settings/window controller 的依赖对象改为由 bridge 生成
  - 对 `runtimeLifecycle.syncWindowMaximizedState` 使用延迟闭包，避免初始化顺序问题

## R：结果

- `src/routes/workspace/+page.svelte` 结构进一步向“state + controller 组装 + 模板”收敛。
- 当前行数约 `1279` 行，虽然这一刀对行数压缩不算最大，但显著减少了 route 内多段重复 setter/getter 桥接代码。

验证结果：

- `pnpm check`：通过，0 errors / 0 warnings。
- `git diff --check`：通过。

风险与回归关注：

- focus tab 配置保存、deadline action、pomodoro config 持久化需要真实 UI 复测。
- workspace settings dialog 的主题、缩放、sidebar layout 设置需要真实 UI 复测。
- 窗口最大化/还原、overlay 显示状态、viewport metrics 刷新需要真实 UI 复测。
