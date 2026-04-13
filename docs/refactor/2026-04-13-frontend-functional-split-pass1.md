# 前端功能域拆分 Pass 1

日期：2026-04-13  
范围：`src/lib` 与 `src/routes` 前端模块结构

## 背景
- 前端主要由三类业务组成：笔记、番茄、休息控制。
- 原先番茄与休息控制都集中在 `workspace/focus` 和 `components/workspace/focus` 下，后续继续修番茄统计、任务计时、休息提醒时容易混淆边界。
- `src/lib/note-search.js` 位于顶层，和已有 `src/lib/note` 目录不一致。

## 本轮调整
- 笔记：
  - `src/lib/note-search.js` 移动为 `src/lib/note/search.js`。
  - `routes/+page.svelte` 与 `routes/workspace/+page.svelte` 改为从 `note/search.js` 导入搜索逻辑。
  - `src/lib/workspace/note/workspace-note-selectors.js` 承接 workspace 页面里的笔记视图筛选、标签统计、可见笔记搜索、Markdown 渲染映射、视图计数、检查器当前笔记选择和日期格式化。
- 设置：
  - `src/lib/workspace/controllers/workspace-settings-actions.js` 承接 workspace 页里的主题切换、自定义 CSS 延迟保存、主题模板导入导出、缩放、字体大小、侧栏布局与主题过渡形状持久化。
- 启动与偏好同步：
  - `src/lib/workspace/controllers/workspace-startup-actions.js` 承接 workspace 页里的开机启动状态初始化与开机启动切换广播。
  - `src/lib/workspace/controllers/workspace-preference-sync.js` 承接 workspace 页里的偏好变更监听同步，例如开机启动与启动展示状态回流。
- 窗口壳层：
  - `src/lib/workspace/controllers/workspace-window-actions.js` 承接 workspace 页里的窗口最小化、隐藏、最大化、Mac 全屏同步、贴纸显隐、贴纸交互切换、视口尺寸刷新与返回紧凑面板动作。
- 笔记视图装配：
  - `src/lib/workspace/controllers/workspace-note-view-actions.js` 承接 workspace 页里的视图切换、初始视图模式切换、排序切换、标签筛选与语言切换。
- 番茄：
  - 番茄任务、计时器、统计组件移动到 `src/lib/components/workspace/pomodoro/`。
  - 番茄模型、统计、截止时间、运行时缓存、任务周期计算移动到 `src/lib/workspace/pomodoro/`。
- 休息控制：
  - 休息控制条移动到 `src/lib/components/workspace/break-control/`。
  - 休息提醒模式、休息 session、桌面通知、全屏休息 overlay 窗口控制移动到 `src/lib/workspace/break-control/`。
- `WorkspaceFocusHub.svelte` 控制器拆分：
  - `src/lib/workspace/pomodoro/focus-task-controller.js` 承接番茄任务会话统计、完成统计、草稿星期切换。
  - `src/lib/workspace/pomodoro/focus-task-controller.js` 同时承接任务开始提醒通知文案构建。
  - `src/lib/workspace/pomodoro/focus-runtime-controller.js` 承接计时器缓存恢复、缓存快照构建、deadline 剩余时间计算。
  - `src/lib/workspace/break-control/break-control-controller.js` 承接休息提醒 watchdog snapshot、休息进度、overlay payload 与 payload key。
  - `src/lib/workspace/break-control/break-control-controller.js` 同时承接休息提醒通知文案构建。
  - `src/lib/workspace/break-control/break-control-event-listeners.js` 承接 break overlay action/ready/native due 事件监听安装与清理。
  - 组件继续持有 Svelte rune 状态，控制器先抽出可纯化的业务规则，降低响应式状态整体搬迁的回归风险。

## 当前边界
- `src/lib/note/`：笔记前端领域逻辑，例如搜索、来源命令、主题。
- `src/lib/components/note/`：笔记详情页组件。
- `src/lib/panel/` 与 `src/lib/components/panel/`：主面板笔记列表、排序、窗口同步和面板交互。
- `src/lib/workspace/pomodoro/`：番茄任务、番茄统计、番茄运行时缓存。
- `src/lib/components/workspace/pomodoro/`：番茄任务规划、计时器、统计展示组件。
- `src/lib/workspace/break-control/`：休息提醒、休息 session、休息 overlay 和通知。
- `src/lib/components/workspace/break-control/`：休息控制界面组件。

## 后续建议
1. `WorkspaceFocusHub.svelte` 仍然是最大前端中枢，下一轮可继续拆出 1s wall clock 与 250ms countdown tick 的 effect 包装。
2. `routes/workspace/+page.svelte` 已拆出笔记派生逻辑与设置动作，但仍承担页面级状态编排，后续可继续按“窗口状态 / 面板操作”拆到 controller 或 store。
3. `routes/workspace/+page.svelte` 现在也已拆出窗口壳层动作、开机启动动作、偏好同步监听和一部分笔记视图动作，但页面仍承担偏多的装配与生命周期逻辑。
4. `WorkbenchSection.svelte` 与 `WorkspaceSidebar.svelte` 属于笔记与面板区域的大组件，建议在番茄/休息控制边界稳定后再拆。

## 验证
- 需要执行：
  - `pnpm check`
  - `git diff --check`
- 目标：
  - Svelte 检查 0 errors / 0 warnings；
  - 纯路径迁移不改变现有前端行为。
