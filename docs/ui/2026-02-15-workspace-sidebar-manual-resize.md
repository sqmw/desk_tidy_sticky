# 2026-02-15 Workspace 侧栏“手动”改为可拖拽分区高度

## 背景问题
- 用户反馈：侧栏设置为“手动”后，无法拖拽调整“导航 / 今日任务”分区高度。
- 根因：原“手动”仅关闭 `auto-priority` 的自动空间分配，不包含分区拖拽交互，语义与用户预期不一致。

## 设计决策
- 保持现有架构不变：`auto` 和 `manual` 仍是同一布局策略枚举。
- 扩展 `manual` 语义为“手动拖拽分区高度”：
  - 在侧栏主体增加水平分隔条（row-resize）。
  - 拖动时实时调整上/下分区高度比例。
  - 拖动结束后持久化比例，重启后恢复。
- `auto` 模式保持历史行为，不引入额外交互变化。

## 实现拆分

### 1) 纯算法模块（避免视图堆逻辑）
- 新增 `src/lib/workspace/sidebar/manual-split-layout.js`
  - `normalizeSidebarManualSplitRatio`
  - `resolveSidebarManualSplitHeights`
  - `calcSidebarManualSplitRatioFromPointer`
- 统一处理：
  - 比例归一化
  - 指针位置 -> 比例
  - 比例 -> 上下分区像素高度
  - 最小分区高度约束

### 2) 偏好持久化链路
- Rust 偏好新增字段：
  - `workspaceSidebarManualSplitRatio`（camelCase 序列化）
  - 文件：`src-tauri/src/preferences.rs`
- 前端偏好服务接入：
  - 文件：`src/lib/workspace/preferences-service.js`
  - 新增 `normalizeWorkspaceSidebarManualSplitRatio`
  - `loadWorkspacePreferences` 返回该字段供工作台初始化

### 3) 侧栏组件接入拖拽
- 文件：`src/lib/components/workspace/WorkspaceSidebar.svelte`
  - 新增手动模式分隔条 UI 与指针事件（`pointerdown/move/up/cancel`）。
  - 通过 `ResizeObserver` 观测侧栏主体高度，保证窗口变化时分区计算稳定。
  - `manual` 模式启用固定分区高度与内部滚动；`auto` 模式行为不变。

### 4) 页面状态与回写
- 文件：`src/routes/workspace/+page.svelte`
  - 新增状态：`workspaceSidebarManualSplitRatio`
  - 拖动中仅更新本地状态，拖动结束再 `savePrefs`，避免高频写入。
  - 通过 props 将输入/提交回调传给 `WorkspaceSidebar`。

### 5) 文案修正（避免再次误解）
- 文件：`src/lib/strings.js`
  - `workspaceSidebarLayoutManual`：
    - EN: `Manual fixed` -> `Manual resize`
    - ZH: `手动固定` -> `手动拖拽`
  - 新增提示文案：`workspaceSidebarManualResizeHint`

## 验证
- `npm run check`：通过（0 errors / 0 warnings）
- `cargo check`：通过（仅历史 dead_code warning）

## 影响范围
- `src/lib/workspace/sidebar/manual-split-layout.js`（新增）
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
- `src/routes/workspace/+page.svelte`
- `src/lib/workspace/preferences-service.js`
- `src-tauri/src/preferences.rs`
- `src/lib/strings.js`

