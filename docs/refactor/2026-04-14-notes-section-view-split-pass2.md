# Notes Section 视图分层拆分记录

日期：2026-04-14
阶段：P4 第二小步
状态：代码完成，待真实 Tauri UI 手工回归

## S：背景

`src/lib/components/panel/NotesSection.svelte` 同时承载两套差异较大的表现层：

- `quadrant` 四象限视图
- `active/archive/trash` 线性列表视图

这两块不仅布局结构不同，连交互也不同：线性列表包含 `Dismissible`、swipe、vertical reorder、archive/trash action；四象限视图则偏只读浏览加轻量编辑动作。继续把它们放在同一个组件里，会让后续优化拖拽、归档或四象限展示时改动范围过大。

## T：任务

本轮目标是按“视图模式”而不是按“零碎动作”拆分 `NotesSection`，让父组件只负责模式切换和 drag ghost，子组件分别承接各自的表现层细节。验收点：

- `quadrant` 视图保持原有展示和基础动作。
- `list` 视图保持 swipe / reorder / archive / trash / pin / priority 等行为入口。
- `pnpm check` 和 `git diff --check` 通过。

## A：行动

- 新增 `src/lib/components/panel/notes/NotesQuadrantBoard.svelte`
  - 下沉四象限布局、quadrant note 卡片、edit/done/priority 动作按钮。
  - 内聚 `buildQuadrants`、quadrant filter 和对应样式。
- 新增 `src/lib/components/panel/notes/NotesLinearList.svelte`
  - 下沉线性列表、`Dismissible`、vertical reorder、archive/trash/pin/z-order/wallpaper/priority 等动作入口。
  - 内聚线性列表图标片段、列表态样式和 action pointer guard。
- 更新 `src/lib/components/panel/NotesSection.svelte`
  - 仅保留 `viewMode` 分发。
  - 仅保留 `drag ghost` 展示和共享渲染样式。
  - 将 `quadrant` 和 `list` 的大块模板与样式迁移到子组件。

## R：结果

- `src/lib/components/panel/NotesSection.svelte` 从约 `713` 行降到约 `144` 行。
- 结构现在分为：
  - 壳层与模式切换：`src/lib/components/panel/NotesSection.svelte`
  - 线性列表视图：`src/lib/components/panel/notes/NotesLinearList.svelte`
  - 四象限视图：`src/lib/components/panel/notes/NotesQuadrantBoard.svelte`
- 这次拆分更像“按功能模式分层”，后续若继续优化：
  - list 侧可以继续单独处理 drag/drop、dismiss action 或 note row
  - quadrant 侧可以继续单独处理 card/header/empty state

验证结果：

- `pnpm check`：通过，0 errors / 0 warnings。
- `git diff --check`：通过。

风险与回归关注：

- active/archive/trash 三种 list 模式的 swipe action 需要真实 UI 复测。
- vertical reorder 的 placeholder、drop target、drag ghost 需要真实 UI 复测。
- quadrant 视图的 edit / done / priority 操作需要真实 UI 复测。
