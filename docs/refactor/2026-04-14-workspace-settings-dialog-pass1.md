# Workspace Settings Dialog 表现层拆分记录

日期：2026-04-14
阶段：P4 第一小步
状态：代码完成，待真实 Tauri UI 手工回归

## S：背景

`src/lib/components/workspace/WorkspaceSettingsDialog.svelte` 同时承载弹窗壳层、general 设置、theme preset/custom css 设置、display 设置和大量对应样式，已经达到 600+ 行。它的主要问题不是业务流转复杂，而是表现层段落堆叠在一个组件里，导致阅读和后续局部修改成本偏高。

## T：任务

本轮目标是做纯表现层拆分，不改变 settings dialog 的交互行为，只把内容按主题分段。验收点：

- general、theme、display 三块保持原有交互行为。
- 父组件继续保留弹窗壳层与 theme import 状态逻辑。
- `pnpm check` 和 `git diff --check` 通过。

## A：行动

- 新增 `src/lib/components/workspace/settings/WorkspaceSettingsGeneralSection.svelte`
- 新增 `src/lib/components/workspace/settings/WorkspaceSettingsThemeSection.svelte`
- 新增 `src/lib/components/workspace/settings/WorkspaceSettingsDisplaySection.svelte`
- 更新 `src/lib/components/workspace/WorkspaceSettingsDialog.svelte`
  - 保留 backdrop / dialog shell / close 行为。
  - 保留 theme import status、copy/import 结果状态。
  - 将 general / theme / display 三块内容改为子组件。

## R：结果

- `src/lib/components/workspace/WorkspaceSettingsDialog.svelte` 从约 `624` 行降到约 `211` 行。
- settings dialog 的结构现在分为：
  - 壳层：`WorkspaceSettingsDialog.svelte`
  - general：`WorkspaceSettingsGeneralSection.svelte`
  - theme：`WorkspaceSettingsThemeSection.svelte`
  - display：`WorkspaceSettingsDisplaySection.svelte`

验证结果：

- `pnpm check`：通过，0 errors / 0 warnings。
- `git diff --check`：通过。

风险与回归关注：

- autostart / show panel on startup 开关需要真实 UI 复测。
- theme preset 切换、导入、导出、复制默认模板、自定义 CSS 编辑需要真实 UI 复测。
- zoom / font size / sidebar layout 变更需要真实 UI 复测。
