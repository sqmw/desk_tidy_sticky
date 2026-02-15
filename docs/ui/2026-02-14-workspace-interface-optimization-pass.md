# 2026-02-14 Workspace 界面优化（UX / 功能 / 结构 / 美学 / 多分辨率）

## 目标
- 在不破坏现有架构前提下，优化工作台整体体验，重点解决：
  - 高缩放与中小窗口下的挤压/溢出问题。
  - 顶部操作区与工具栏在不同分辨率下的一致性。
  - 侧栏在窄宽与低高度下的可读性和可操作性。

## 改动总览
## 1) 结构层：新增统一舞台布局解析器
- 新增：`src/lib/workspace/layout/workspace-stage-layout.js`
- 提供统一计算：
  - `windowBarCompact`
  - `toolbarCompact`
  - `focusCompact`
  - `sidebarMaxWidth`
  - `recommendedSidebarWidth`
- 作用：把“缩放 + 分辨率 + 侧栏宽度”统一在一处决策，避免各组件分散硬编码。

## 2) 多分辨率适配：侧栏宽度联动与拖拽上限动态化
- `src/routes/workspace/+page.svelte`
  - 接入 `resolveWorkspaceStageLayout`。
  - 增加侧栏宽度自动收敛：当分辨率/缩放变化时，把侧栏自动约束到推荐范围。
- `src/lib/workspace/resize-controller.js`
  - 支持 `getSidebarMaxWidth`，拖拽时实时应用动态上限。
- 结果：
  - 在 100%/125%/140% 缩放下，侧栏不再轻易挤压主区到不可用。
  - 侧栏拖拽行为和自适应规则一致，不会“拖得过去但显示不下”。

## 3) UX + 美学：顶部窗口栏紧凑模式
- `src/lib/components/workspace/WorkspaceWindowBar.svelte`
  - 新增 `compact` 模式。
  - 在紧凑模式下压缩按钮尺寸/间距，`返回简洁`按钮自动变图标态，降低横向占用。
  - 小屏下允许 action 区换行，避免按钮被挤出可点击区。

## 4) UX + 功能：工具栏紧凑模式和信息密度优化
- `src/lib/components/workspace/WorkspaceToolbar.svelte`
  - 新增 `compact` 模式，降低 padding/gap，优先保证可操作性。
- `src/lib/components/workspace/toolbar/WorkspaceCreateBar.svelte`
  - 新增 `compact` 模式，输入区、标签区、创建动作在窄宽下更平滑收敛。
- `src/lib/components/workspace/toolbar/WorkspaceQueryBar.svelte`
  - 新增 `compact` 模式，搜索框高度与间距统一。

## 5) 侧栏视觉与可读性收敛
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
  - 添加 `container-type: inline-size`，按侧栏实际宽度做内部适配。
  - 缩小过大字号与间距，统一卡片在窄宽状态下的视觉密度。
  - 增加 `@container (max-width: 230px)` 规则，确保极窄侧栏下文字与按钮仍可读可点。

## 6) 侧栏分区高度算法升级（按有效设计尺寸）
- `src/lib/workspace/sidebar/sidebar-layout.js`
  - 从“原始像素判断”升级为“缩放后设计坐标判断”。
  - `compact` 判定和分区高度计算更符合视觉实际。
  - 结果：高 DPI + 高缩放下，分区滚动与折叠行为更稳定。

## 7) 导航区最小化策略（今日任务优先）
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
  - `sidebar-body` 从 `grid` 改为 `flex-column`，避免首块（导航）在剩余空间下被强制拉伸。
  - 常规分区改为 `flex: 0 0 auto`，仅“今日任务”分区保持 `flex: 1 1 auto`。
  - 结果：导航区只占内容所需高度，剩余空间优先留给“今日任务”列表。

## 8) 新增布局策略开关（Auto / Manual）
- 新增设置项：`侧栏布局`
  - `自动优先`：导航最小化，今日任务优先占用剩余空间。
  - `手动固定`：关闭自动优先，所有分区按内容高度排布。
- 持久化链路：
  - Rust 偏好字段：`workspaceSidebarLayoutMode`
  - 前端读取与规范化：`normalizeWorkspaceSidebarLayoutMode`
  - 设置弹窗可切换并实时保存。

## 验证
- `npm run check`：通过（0 errors / 0 warnings）
- `cargo check`：通过（仅历史 warning）

## 本次涉及文件
- `src/lib/workspace/layout/workspace-stage-layout.js`（新增）
- `src/routes/workspace/+page.svelte`
- `src/lib/workspace/resize-controller.js`
- `src/lib/workspace/sidebar/sidebar-layout.js`
- `src/lib/components/workspace/WorkspaceWindowBar.svelte`
- `src/lib/components/workspace/WorkspaceToolbar.svelte`
- `src/lib/components/workspace/toolbar/WorkspaceCreateBar.svelte`
- `src/lib/components/workspace/toolbar/WorkspaceQueryBar.svelte`
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
- `src/lib/components/workspace/WorkspaceFocusHub.svelte`
