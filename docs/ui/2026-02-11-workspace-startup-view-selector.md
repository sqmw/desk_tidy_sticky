# Workspace 初始视图选择（2026-02-11）

## 背景

工作台的“笔记视图”同时包含 `全部 / 待办 / 四象限 / 已归档 / 回收站`。此前应用启动后默认只依赖上次状态，用户无法明确指定“启动时优先进入哪个视图”，导致切换心智不稳定。

## 目标

1. 让用户明确配置工作台启动后打开的首个笔记视图。
2. 保留“跟随上次使用”的习惯路径，避免破坏旧用户行为。
3. 不影响现有 `viewMode` 切换与排序逻辑。

## 方案

### 1) 新增启动策略

新增 `workspaceInitialViewMode`，可选值：

- `last`（跟随上次）
- `active`（全部）
- `todo`（待办）
- `quadrant`（四象限）

对应实现放在：

- `src/lib/workspace/workspace-tabs.js`

新增能力：

- `WORKSPACE_INITIAL_VIEW_MODES`
- `normalizeWorkspaceInitialViewMode(value)`
- `resolveWorkspaceStartupViewMode(initialViewMode, rememberedViewMode)`
- `getWorkspaceInitialViewModeLabel(strings, mode)`

### 2) 偏好加载阶段统一解析

在 `loadWorkspacePreferences` 内先读取 `workspaceInitialViewMode`，再决定启动实际 `viewMode`：

- `last`：使用已保存 `viewMode`
- 固定模式：直接使用对应模式

实现位置：

- `src/lib/workspace/preferences-service.js`

### 3) 侧栏增加“初始视图”配置入口

仅在“笔记”主模块下显示下拉选择器，避免番茄模块干扰。

实现位置：

- `src/lib/components/workspace/WorkspaceSidebar.svelte`
- `src/lib/strings.js`

新增文案键：

- `workspaceInitialView`
- `workspaceInitialViewLast`

### 4) 后端偏好字段持久化

Rust 偏好结构新增字段：

- `workspace_initial_view_mode`

默认值：

- `last`

实现位置：

- `src-tauri/src/preferences.rs`

## 交互规则

1. 用户在侧栏修改“初始视图”后立即持久化。
2. 若选择 `active/todo/quadrant`，当前界面立即切到该视图（所见即所得）。
3. 若选择 `last`，当前不强制跳转，仅影响下次启动策略。

## 兼容性

- 老配置文件没有该字段时自动回退到 `last`。
- 旧版 `viewMode` 数据继续生效。
- 不改变便笺实体数据结构。

## 验证

已执行：

- `npm run check`：0 error / 0 warning
- `cargo check`：通过（存在历史 `dead_code` 警告，与本次功能无关）

## 结果

工作台“视图切换”与“启动默认入口”分离：

- 切换：解决当前任务流。
- 初始视图：解决下次进入工作台时的预期一致性。
