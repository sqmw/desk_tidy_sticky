# Workbench 组件分层拆分 Pass 3

日期：2026-04-13  
范围：`src/lib/components/panel/WorkbenchSection.svelte` 及 `src/lib/components/panel/workbench/*`

## 背景
- `WorkbenchSection.svelte` 长期承担过多职责：  
  - 四象限渲染与拖拽占位逻辑  
  - 普通网格卡片渲染与操作按钮  
  - 优先级/标签菜单弹层  
  - 拖拽幽灵层渲染  
  - 页面壳层滚动与窗口级事件绑定
- 单文件体量高（此前约 1600 行级别），导致定位与回归成本偏高。

## 本轮拆分

### 1) 组件拆分（按 UI 责任）
- 新增：`src/lib/components/panel/workbench/WorkbenchQuadrantBoard.svelte`
  - 负责四象限视图渲染、象限卡片动作区、占位插槽显示。
- 新增：`src/lib/components/panel/workbench/WorkbenchNoteGrid.svelte`
  - 负责非四象限视图（active/todo/archived/trash）卡片网格渲染。
- 新增：`src/lib/components/panel/workbench/WorkbenchPriorityMenu.svelte`
  - 负责优先级与自定义标签弹层 UI。
- 新增：`src/lib/components/panel/workbench/WorkbenchDragGhost.svelte`
  - 负责 pointer 拖拽幽灵层 UI。

### 2) 壳层收敛
- `WorkbenchSection.svelte` 保留为“装配 + 交互状态控制”：
  - pointer 拖拽状态机与 drop 规则；
  - 优先级菜单位置计算与事件收口；
  - 子组件 props 装配；
  - `svelte:window` 级事件挂载。

### 3) 无用状态收敛
- 移除当前 pointer 方案下已不再参与决策的状态：
  - `hoverAnchorId`
  - `hoverBeforeAnchor`

## 当前边界（更新）
- `panel/WorkbenchSection.svelte`：交互编排层（状态机、事件、调度）。
- `panel/workbench/WorkbenchQuadrantBoard.svelte`：四象限表现层。
- `panel/workbench/WorkbenchNoteGrid.svelte`：普通列表/网格表现层。
- `panel/workbench/WorkbenchPriorityMenu.svelte`：弹层表现层。
- `panel/workbench/WorkbenchDragGhost.svelte`：拖拽幽灵表现层。

## 结果
- `WorkbenchSection.svelte` 体量降到约 `605` 行，职责聚焦到编排层。
- 渲染细节迁移到 `panel/workbench/` 子目录，模块命名可直接表达职责。

## 验证
- 已执行：
  - `pnpm check`
- 结果：
  - `svelte-check found 0 errors and 0 warnings`

