# Workstation 拖动误触与番茄区样式退化修复（2026-02-09）

## 问题
1. 工作台存在拖动误触：在左侧操作区点击时偶发触发窗口拖动。
2. 番茄区视觉层级弱，在部分环境下接近原生表单观感。

## 根因
1. 旧实现把侧栏整体作为拖动热区，交互面过大。
2. 番茄区样式依赖子组件，缺少父级兜底策略。

## 修复
1. 拖动策略改为显式句柄：
   - `window-drag.js` 增加 `data-drag-handle=\"workspace\"` 校验。
   - 顶部仅标题拖动区可拖动。
   - 左侧仅品牌区可拖动。
   - 去掉左上角可见的拖动横条，避免视觉干扰。
2. 番茄区增加功能与视觉强化：
   - 任务支持目标番茄数。
   - 任务行显示番茄进度。
   - 统计卡增加今日任务进度和完成率。
   - 增加父级兜底样式，避免退化。
3. 主题切换与布局细节修复：
   - 深浅色切换持久化改为显式保存 `nextTheme`，避免异步状态导致保存旧值。
   - “添加任务”按钮列改为 `minmax(92px, max-content)`，并强制单行文本，防止中文换行溢出。
4. 工作台番茄模式侧栏清理：
   - 去掉“番茄说明卡（专注任务与番茄规划）”展示，减少信息噪声。
5. 番茄输入区自适应重排：
   - 大屏 6 列，中屏 4 列，窄屏 2 列；
   - 新增字段级栅格规则，确保按钮和输入框在任意宽度不溢出。
6. 工作台窗口行为与状态可见性：
   - 去掉 workspace 顶部 `X` 隐藏按钮（避免和系统关闭语义混淆）。
   - 去掉左侧“隐藏窗口”入口，避免重复入口。
   - “贴纸鼠标交互”按钮改为状态文案（开/关可见）。
7. 侧栏内容升级：
   - 番茄模式下将说明占位块改为“今日截止任务”列表。
   - 列表按截止时间排序，展示超时/剩余分钟与任务时间段。

## 影响范围
1. `src/lib/workspace/window-drag.js`
2. `src/lib/components/workspace/WorkspaceWindowBar.svelte`
3. `src/lib/components/workspace/WorkspaceSidebar.svelte`
4. `src/lib/components/workspace/WorkspaceFocusHub.svelte`
5. `src/lib/components/workspace/focus/WorkspaceFocusTimer.svelte`
6. `src/lib/components/workspace/focus/WorkspaceFocusPlanner.svelte`
7. `src/lib/components/workspace/focus/WorkspaceFocusStats.svelte`
8. `src/lib/workspace/focus/focus-model.js`
9. `src/lib/workspace/focus/focus-deadlines.js`
10. `src/routes/workspace/+page.svelte`
11. `src/lib/strings.js`

## 补充修复（同日）
1. 恢复工作台右上角 `X` 的窗口隐藏行为：
   - `WorkspaceWindowBar` 新增 `onHide` 回调并接入关闭按钮。
   - `workspace/+page.svelte` 增加 `hideWindow()` 并传入顶部栏。
2. 明确左下角入口策略：
   - 保留右上角 `X` 作为唯一“隐藏窗口”入口。
   - 左下设置区不再提供“隐藏窗口”重复按钮。
3. 工作台副标题调整为更贴近用途：
   - 从“复杂任务与规划视图”改为“便笺与专注一体工作台”。
