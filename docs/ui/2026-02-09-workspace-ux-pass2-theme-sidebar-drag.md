# 2026-02-09 工作台体验优化（Pass 2）

## 目标
根据最新反馈，完善工作台的 4 个体验点：
1. 增大可拖拽区域（侧栏和空白区可拖动窗口）。
2. 左侧标题字号过大，降低视觉压迫感。
3. 增加亮色/暗色模式。
4. 左侧栏支持收起与展开。

## 实现
### 1) 可拖拽区域增强
- 文件：`src/routes/workspace/+page.svelte`
- 调整：
  - `workspace` 根容器增加 `onpointerdown` 拖拽入口。
  - 增加 `isInteractiveTarget()` 过滤，按钮/输入框/卡片操作区不触发拖拽。
- 文件：`src/lib/components/workspace/WorkspaceSidebar.svelte`
  - 侧栏容器支持拖拽事件透传（空白区域可拖）。

### 2) 左侧标题视觉优化
- 文件：`src/lib/components/workspace/WorkspaceSidebar.svelte`
- 调整：
  - `h1` 字号从 `40px` 下调到 `30px`。
  - 收起状态进一步缩小为 `18px`。

### 3) 亮/暗主题支持（并持久化）
- 文件：`src-tauri/src/preferences.rs`
  - 新增：
    - `workspace_theme`（默认 `light`）
    - `workspace_sidebar_collapsed`（默认 `false`）
- 文件：`src/routes/workspace/+page.svelte`
  - 读取/保存主题偏好。
  - 根容器增加 `theme-dark` 样式分支。
- 文件：`src/lib/strings.js`
  - 新增主题与侧栏操作文案键。

### 4) 左侧栏收起/展开
- 文件：`src/lib/components/workspace/WorkspaceWindowBar.svelte`
  - 增加侧栏切换按钮（`⇤ / ⇥`）。
- 文件：`src/routes/workspace/+page.svelte`
  - 控制 `sidebarCollapsed` 并持久化。
  - 根容器增加 `sidebar-collapsed` 布局类。
- 文件：`src/lib/components/workspace/WorkspaceSidebar.svelte`
  - 收起态渲染压缩文案与紧凑按钮样式。

## 验证
1. `npm run check`：通过（0 errors / 0 warnings）
2. `cargo check`：通过（仅既有 warning）

## 补充（Cursor 一致性）
根据后续反馈，工作台拖拽光标进一步统一：
- 文件：`src/routes/workspace/+page.svelte`
  - 修正为：工作台根容器保持 `cursor: default`，避免内容区误显示拖拽光标。
  - 交互控件（`button/input/select/textarea`）维持各自合适光标（`pointer/text`）。
- 文件：`src/lib/components/workspace/WorkspaceWindowBar.svelte`
  - 顶部拖拽栏光标统一为 `all-scroll`。
- 文件：`src/lib/components/workspace/WorkspaceSidebar.svelte`
  - 左侧栏空白可拖区域统一 `all-scroll`。

说明：
- `all-scroll` 只在“明确可拖拽”区域展示（顶部栏、侧栏）。
- 主内容区（卡片区域）保持正常箭头，避免误导用户。
