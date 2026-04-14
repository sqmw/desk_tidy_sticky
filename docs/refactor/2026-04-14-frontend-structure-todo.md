# 前端结构整理 TODO

日期：2026-04-14  
范围：`src/routes`、`src/lib/components`、`src/lib/workspace`、`src/lib/panel`  
状态：进行中

## 目标
- 降低前端大文件和路由入口的认知成本。
- 保持现有 SvelteKit + Tauri 架构稳定，不做一次性重写。
- 按功能域拆分表现层、运行时编排层和领域 helper。
- 每轮结构调整都同步文档并执行最小必要验证。

## 当前基线
- 已完成：
  - `workspace/focus` 拆为 `workspace/pomodoro` 与 `workspace/break-control`。
  - `routes/workspace/+page.svelte` 已抽出部分 controller 和 workspace note selectors。
  - `WorkbenchSection.svelte` 已拆出 `components/panel/workbench/*` 表现层组件。
  - `WorkspaceFocusHub.svelte` 已拆出 `WorkspaceFocusHubView.svelte` 表现层。
  - 全局 reset 已集中到 `src/lib/styles/base.css` 和 `routes/+layout.svelte`。
  - panel/note 公共 tag、date、selector helper 已下沉到 `src/lib/note` 与 `src/lib/panel`。
- 当前较大文件（2026-04-14 快照）：
  - `src/lib/components/workspace/WorkspaceFocusHub.svelte`：约 1516 行。
  - `src/routes/workspace/+page.svelte`：约 1349 行。
  - `src/lib/components/workspace/WorkspaceSidebar.svelte`：约 1318 行。
  - `src/routes/note/[id]/+page.svelte`：约 946 行。
  - `src/lib/workspace/theme/theme-default-template.js`：约 755 行。
  - `src/lib/components/panel/NotesSection.svelte`：约 713 行。

## 阶段计划

### P0：Sticky Note 详情页结构整理
状态：代码拆分完成，待真实 Tauri UI 手工回归
优先级：最高  
目标文件：`src/routes/note/[id]/+page.svelte`

计划：
- 抽出 note 数据与命令动作：已完成第一步
  - 候选：`src/lib/note/note-window-actions.js`
  - 已覆盖：load snapshot、note id 解析、命令 invoke 参数统一、tag suggestions。
  - 后续覆盖：sync/save 的进一步状态边界收敛。
- 抽出贴纸样式动作：已完成第一步
  - 候选：`src/lib/note/note-style-actions.js`
  - 已覆盖：background/text color、opacity、frost、延迟保存、wheel 调整、picker 输入、cleanup。
- 抽出编辑器能力：已完成第一步
  - 候选：`src/lib/note/note-editor-actions.js`
  - 已覆盖：图片粘贴、命令建议识别、命令插入、键盘导航、编辑保存 timer、cleanup。
- 抽出窗口拖拽能力：已完成第一步
  - 候选：`src/lib/note/note-window-drag.js`
  - 已覆盖：manual drag state、pointer down/move/up、Tauri window position 更新、cleanup。
- 清理 `@ts-ignore`：已完成第一步
  - 先通过 JSDoc 标注 `invoke("load_notes")` 返回数组形态；
  - 不为了消除 warning 引入过重类型系统。

当前进展：
- 2026-04-14：完成 P0 第一轮保守拆分，详情见 `docs/refactor/2026-04-14-note-detail-structure-pass1.md`。
- 2026-04-14：完成 P0 第二轮样式动作拆分，详情见 `docs/refactor/2026-04-14-note-detail-style-actions-pass2.md`。
- 2026-04-14：完成 P0 第三轮编辑器动作拆分，详情见 `docs/refactor/2026-04-14-note-detail-editor-actions-pass3.md`。
- 2026-04-14：P0 代码拆分收口，详情页从约 946 行降到约 575 行；真实 Tauri UI 手工回归仍待执行。

验收：
- `pnpm check` 通过。
- `git diff --check` 通过。
- 手工回归关注：编辑保存、图片粘贴、命令建议、拖拽、pin/topmost/wallpaper、颜色/透明度/毛玻璃。

### P1：Workspace Sidebar 分层
状态：进行中
优先级：高  
目标文件：`src/lib/components/workspace/WorkspaceSidebar.svelte`

计划：
- 拆出主模块入口：已完成第一步
  - 候选：`components/workspace/sidebar/WorkspaceSidebarModules.svelte`
  - 已覆盖：主 tab、compact/collapsed 状态展示。
- 拆出笔记筛选区：已完成第一步
  - 候选：`components/workspace/sidebar/WorkspaceSidebarNoteFilters.svelte`
  - 已覆盖：view mode、sort mode、tag filter、count badge、compact/collapsed 展示。
- 拆出 deadline 区：已完成第一步
  - 候选：`components/workspace/sidebar/WorkspaceSidebarDeadlines.svelte`
  - 已覆盖：deadline list、状态文案、deadline action、compact/collapsed 展示。
- 保留壳层：
  - manual split resize；
  - ResizeObserver；
  - 高度计算与 collapsed/compact layout 状态。

验收：
- `pnpm check` 通过。
- 手工回归关注：sidebar 手动分割、tag filter、deadline action、mac traffic lights 位置。

当前进展：
- 2026-04-14：完成 P1 第一轮笔记筛选区组件拆分，详情见 `docs/refactor/2026-04-14-workspace-sidebar-note-filters-pass1.md`。
- 2026-04-14：完成 P1 第二轮 deadline 区组件拆分，详情见 `docs/refactor/2026-04-14-workspace-sidebar-deadlines-pass2.md`。
- 2026-04-14：完成 P1 第三轮主模块入口组件拆分，详情见 `docs/refactor/2026-04-14-workspace-sidebar-modules-pass3.md`。

### P2：Workspace FocusHub 运行时继续拆分
状态：进行中
优先级：中高  
目标文件：`src/lib/components/workspace/WorkspaceFocusHub.svelte`

计划：
- 第一小步：抽出 timer runtime facade：已完成第一步。
  - 候选：`workspace/pomodoro/focus-timer-controller.js`
  - 已覆盖：restore/cache/persist、toggle/reset/preset。
  - 暂未下沉：focus interval tick 与 break interval tick，保留在组件层等待 break/task controller 边界继续收敛。
- 第二小步：抽出 break overlay lifecycle facade。
  - 候选：`workspace/break-control/break-overlay-lifecycle.js`
  - 覆盖：ensure/sync/close overlay、payload key、queued sync 状态。
- 第三小步：抽出 task draft facade。
  - 候选：`workspace/pomodoro/focus-task-draft-controller.js`
  - 覆盖：add/update/remove/toggle weekday/open settings/save config。

约束：
- 这块有定时器、overlay、notification、localStorage cache，必须小步改。
- 每一小步都要跑 `pnpm check`。
- 如果涉及可见番茄/休息行为，必须补充对应 `docs/ui` 或 `docs/refactor` 说明。

验收：
- `pnpm check` 通过。
- 手工回归关注：开始/暂停、任务切换、番茄完成、休息提醒、fullscreen overlay、postpone/skip、刷新恢复。

当前进展：
- 2026-04-14：完成 P2 第一轮 timer runtime controller 拆分，详情见 `docs/refactor/2026-04-14-workspace-focus-hub-timer-runtime-pass1.md`。

### P3：Workspace 页面装配层瘦身
状态：待办  
优先级：中  
目标文件：`src/routes/workspace/+page.svelte`

计划：
- 抽出 workspace page state factory 或 state groups。
- 抽出 viewport/scale 派生值。
- 抽出 inspector/sidebar resize 装配。
- 保留 route 入口作为：
  - 状态初始化；
  - controller 组装；
  - 顶层布局组件绑定。

约束：
- 先完成 P0/P1/P2 后再做，避免 route 入口和子组件同步大改导致回归面过大。

验收：
- `pnpm check` 通过。
- 手工回归关注：workspace 启动偏好、主题、缩放、sidebar/inspector resize、main tab 切换。

### P4：次级大文件与类型清理
状态：待办  
优先级：中低

候选：
- `src/lib/workspace/theme/theme-default-template.js`
  - 可考虑拆为 token sections 或模板片段。
- `src/lib/components/panel/NotesSection.svelte`
  - 可按 list rendering、drag ghost、trash/archive action 分层。
- `src/lib/components/workspace/WorkspaceSettingsDialog.svelte`
  - 可按 theme/display/startup/break settings 分组组件。
- `src/lib/strings.js`
  - 可按领域拆为 `strings/note.js`、`strings/workspace.js` 等，再聚合导出；此项影响面大，后置。
- `src/lib/Dismissible.svelte`、`src/lib/note/search.js`
  - 清理少量 `@ts-ignore`，优先以 JSDoc 或局部 helper 修正。

## 已有关联文档
- `docs/refactor/2026-04-13-frontend-functional-split-pass1.md`
- `docs/refactor/2026-04-13-frontend-structure-cleanup-pass2.md`
- `docs/refactor/2026-04-13-workbench-component-layer-split-pass3.md`
- `docs/refactor/2026-04-14-workspace-focus-hub-view-split-pass4.md`

## 每轮更新规则
- 每完成一个阶段或子阶段，更新本 TODO 的状态。
- 每轮代码改动必须同步对应 `docs/refactor` 或 `docs/ui`。
- 每轮至少执行：
  - `pnpm check`
  - `git diff --check`
- 若验证受限，必须在交付说明和对应文档中记录原因与剩余风险。
