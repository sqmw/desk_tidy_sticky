# Workspace Sidebar Deadline 区拆分第二轮

日期：2026-04-14
范围：`src/lib/components/workspace/WorkspaceSidebar.svelte`、`src/lib/components/workspace/sidebar/WorkspaceSidebarDeadlines.svelte`
状态：已完成代码拆分并通过验证

## 背景

P1 第一轮已经拆出 `WorkspaceSidebarNoteFilters.svelte`。`WorkspaceSidebar.svelte` 剩余的大块表现层主要是 deadline 区、主模块入口和 settings action。deadline 区包含列表、状态文案、过期样式、snooze action 与 compact/collapsed 展示，适合继续作为独立表现层组件拆出。

## 拆分内容

- 新增 `src/lib/components/workspace/sidebar/WorkspaceSidebarDeadlines.svelte`
  - 接管 deadline 空态、折叠态计数、deadline list 渲染。
  - 接管 deadline 状态文案和剩余/当前轮次文案 helper。
  - 接管 item click、keyboard action、snooze15、snooze30。
  - 接管 deadline 区相关 scoped styles 和 overdue pulse 动画。
- 更新 `src/lib/components/workspace/WorkspaceSidebar.svelte`
  - 移除 deadline 模板、helper 和专用样式。
  - 保留 `deadlinesCollapsed` 状态，由父组件通过回调控制。
  - 保留 manual layout 高度计算，向子组件传入 `blockStyle` 与 `manualLayoutEnabled`。
  - 未改主模块入口、settings action、manual split resize 算法。

## 行为约束

- `onDeadlineAction(item.id)` 点击行为保持不变。
- keyboard Enter / Space 触发 deadline action 的行为保持不变。
- snooze15 / snooze30 仍通过 `onDeadlineAction(item.id, "snooze15" | "snooze30")` 触发。
- manual split 的高度变量仍由父组件计算，子组件只消费 CSS variables。

## 验证

- `pnpm check`：通过，`svelte-check` 0 error / 0 warning。
- `git diff --check`：通过。
- 未执行真实 UI 手工回归；deadline action、compact/collapsed 展示和 manual split 仍需后续抽测。

## 后续

- P1 下一步可拆主模块入口：`WorkspaceSidebarModules.svelte`。
- 如果主模块入口拆完后父组件仍偏复杂，再考虑把 manual split resize 抽为 controller。
