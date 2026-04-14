# Workspace Sidebar 主模块入口拆分第三轮

日期：2026-04-14
范围：`src/lib/components/workspace/WorkspaceSidebar.svelte`、`src/lib/components/workspace/sidebar/WorkspaceSidebarModules.svelte`
状态：已完成代码拆分并通过验证

## 背景

P1 前两轮已经拆出笔记筛选区和 deadline 区。`WorkspaceSidebar.svelte` 中剩余的顶部模块入口仍包含主 tab 模板和样式；这部分逻辑简单，但与 `modulesBlockEl` 测量外壳绑定在一起。

本轮采用薄组件方式拆分：父组件继续保留 `.modules-block` 外壳、`bind:this={modulesBlockEl}` 和 manual layout 高度，子组件只接管标题与主 tab 渲染。

## 拆分内容

- 新增 `src/lib/components/workspace/sidebar/WorkspaceSidebarModules.svelte`
  - 接管 `workspaceModules` 标题。
  - 接管主 tab button 渲染、active 状态、collapsed 标签首字展示。
  - 接管 main tab 相关 scoped styles。
- 更新 `src/lib/components/workspace/WorkspaceSidebar.svelte`
  - 保留 `mainTabs` 派生值和 `modulesBlockEl` 测量外壳。
  - 使用 `WorkspaceSidebarModules` 替换内联主模块入口模板。
  - 移除父组件中 main tab 专用样式。

## 行为约束

- `onSetMainTab(tab.key)` 调用保持不变。
- collapsed 时仍显示 tab label 首字。
- manual split 的顶部模块高度测量仍由父组件外壳负责。
- 未改 manual split resize 算法。

## 验证

- `pnpm check`：通过，`svelte-check` 0 error / 0 warning。
- `git diff --check`：通过。
- 未执行真实 UI 手工回归；主 tab、collapsed/compact 展示和 manual split 顶部高度仍需后续抽测。

## 后续

- P1 可继续拆 settings action，或先抽 manual split resize controller。
- 当前父组件已主要保留装配、manual split 计算、settings action 和品牌区。
