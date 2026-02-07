# 2026-02-07 架构整理（Phase 3）

## 原则
本阶段遵循“能拆就拆，但不为拆而拆”：只拆边界清晰、复用潜力高、且会明显降低认知负担的模块。

## 实际拆分
针对 `PanelHeader`，提取了 3 个高内聚模块：

1. `src/lib/components/panel/HeaderActions.svelte`
- 承接顶部动作按钮区（置顶、语言、设置、玻璃透明度、隐藏窗口）。

2. `src/lib/components/panel/SortModeMenu.svelte`
- 承接排序下拉菜单及菜单开关状态。

3. `src/lib/components/panel/SearchBar.svelte`
- 承接搜索输入与清空交互。

## 为什么这次拆分是必要的
- 三个区域与 `PanelHeader` 其余部分（输入框、视图 tab、底部开关）职责天然不同。
- 交互复杂点（排序菜单显隐、头部按钮组）迁移后，`PanelHeader` 更像一个“编排组件”。
- 没有把每个按钮都拆成独立组件，避免过度碎片化。

## 结果
- `src/lib/components/panel/PanelHeader.svelte`: `547 -> 270` 行
- 新增 3 个子组件后，结构层次更清晰，维护时定位更直接。

## 验证
- `npm run build`：通过

## 当前建议
- 目前拆分粒度已经合理；下一步优先做行为测试补充，而不是继续拆 UI 文件。
