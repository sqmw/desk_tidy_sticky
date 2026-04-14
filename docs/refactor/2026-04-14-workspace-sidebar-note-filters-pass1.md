# Workspace Sidebar 笔记筛选区拆分第一轮

日期：2026-04-14
范围：`src/lib/components/workspace/WorkspaceSidebar.svelte`、`src/lib/components/workspace/sidebar/WorkspaceSidebarNoteFilters.svelte`
状态：已完成代码拆分并通过验证

## 背景

`WorkspaceSidebar.svelte` 同时承载主模块入口、笔记筛选、deadline、settings action、manual split resize、ResizeObserver 和大量局部样式。P0 完成 Sticky Note 详情页拆分后，TODO 进入 P1：对 sidebar 做表现层分层。

本轮优先拆笔记筛选区，因为它主要依赖 props、选择器状态和回调，不触碰 manual split resize 的核心计算与 deadline action 逻辑。

## 拆分内容

- 新增 `src/lib/components/workspace/sidebar/WorkspaceSidebarNoteFilters.svelte`
  - 接管 view mode 主/次分组渲染。
  - 接管 startup view select、sort select。
  - 接管 tag filter、all tags、tag count badge。
  - 接管 compact/collapsed 状态下的显示和折叠按钮。
  - 接管 note filters 相关 scoped styles。
- 更新 `src/lib/components/workspace/WorkspaceSidebar.svelte`
  - 移除 note filters 区块的模板和局部 helper。
  - 保留 `noteFiltersCollapsed` 状态，由父组件通过回调控制。
  - 保留 manual layout 高度计算，向子组件传入 `blockStyle` 与 `manualLayoutEnabled`。
  - 移除父组件中 note filters 的 scoped CSS，降低父组件样式负担。

## 行为约束

- view mode、initial view、sort mode、selected tag 的回调名称和调用时机保持不变。
- `noteFiltersCollapsed` 仍由父组件持有，避免 compact 布局状态在子组件内部失联。
- manual split 的高度变量仍由父组件计算，子组件只消费 CSS variables。
- 未改 deadline、settings action、main tab、manual resize 算法。

## 验证

- `pnpm check`：通过，`svelte-check` 0 error / 0 warning。
- `git diff --check`：通过。
- 未执行真实 UI 手工回归；sidebar 手动分割、tag filter、compact/collapsed 展示仍需后续抽测。

## 后续

- P1 下一步建议拆 deadline 区：`WorkspaceSidebarDeadlines.svelte`。
- manual split resize 暂时保留在父组件，等 note filters 和 deadline 都拆出后再判断是否需要独立 controller。
