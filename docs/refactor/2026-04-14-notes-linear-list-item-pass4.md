# Notes Linear List Item 拆分记录

日期：2026-04-14
阶段：P4 第四小步
状态：代码完成，待真实 Tauri UI 手工回归

## S：背景

在前一轮 `NotesSection` 视图模式拆分后，`src/lib/components/panel/notes/NotesLinearList.svelte` 仍然同时承担两层职责：

- list 容器与 keyed each 动画壳
- 单条 note 的 `Dismissible`、swipe、reorder handle、pin/priority/archive/trash 等动作行

这会让后续如果只想调整 note row 的动作、样式或拖拽入口时，仍然需要在列表容器里处理大量细节。

## T：任务

本轮目标是继续按层次把 `NotesLinearList` 拆成“列表容器”和“单条 note 行”，同时保持现有 drag / swipe / action 行为不变。验收点：

- keyed each + `animate:flip` 仍由列表容器掌握。
- `Dismissible`、archive/trash、pin/z-order/wallpaper、priority、done 等动作仍正常接线。
- `pnpm check` 和 `git diff --check` 通过。

## A：行动

- 新增 `src/lib/components/panel/notes/NotesLinearListItem.svelte`
  - 下沉单条 note 的 `Dismissible`。
  - 下沉 note row 内容、动作按钮、图标片段与行样式。
- 更新 `src/lib/components/panel/notes/NotesLinearList.svelte`
  - 保留 list 容器、scroll 区、keyed each、`transition:slide`、`animate:flip`。
  - 保留 drag placeholder / drop target 的壳层样式。
  - 将单条 note 行改为渲染 `NotesLinearListItem.svelte`。
- 处理一次 Svelte 约束修正：
  - `animate:flip` 不能下沉到子组件根节点，必须保留在 keyed each 的唯一直接子元素上。
  - 因此最终边界是“动画壳在父层，row 内容在子层”。

## R：结果

- `src/lib/components/panel/notes/NotesLinearList.svelte` 从约 `521` 行降到约 `126` 行。
- `src/lib/components/panel/notes/NotesLinearListItem.svelte` 新增约 `431` 行，专门承接 note row 行为和样式。
- `NotesLinearList` 现在的职责更清楚：
  - 父层：列表滚动区、keyed each、动画壳、drag placeholder / drop target
  - 子层：单条 note 的 swipe / reorder / action row

验证结果：

- `pnpm check`：通过，0 errors / 0 warnings。
- `git diff --check`：通过。

风险与回归关注：

- active/archive/trash 三种模式的 swipe 行为需要真实 UI 复测。
- reorder handle、drop target、drag ghost 需要真实 UI 复测。
- pinned note 的 z-order / wallpaper layer / priority 切换需要真实 UI 复测。
