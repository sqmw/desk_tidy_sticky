# Workspace 信息架构对齐（Pass 1）

## 背景
- 当前产品定位已从「轻便笺」扩展到「笔记 + 任务 + 专注」。
- 旧文案与导航命名仍偏「便笺工具」，会造成用户认知偏差。

## 本次调整（已落地）

### 1. 统一导航语义
- 将侧栏「模块」改为更明确的导航入口语义。
- 将「便笺筛选」改为「视图」，避免把工作台理解为仅过滤便笺。
- 文案更新：
  - `workspaceModules`: `模块` -> `导航`
  - `workspaceTabNotes`: `便笺` -> `笔记`
  - `workspaceTabFocus`: `番茄` -> `专注`
  - `workspaceNoteFilters`: `便笺筛选` -> `视图`
  - `workspaceHint`: `便笺与专注一体工作台` -> `笔记、任务与专注的一体工作台`

### 2. 去除侧栏硬编码分支
- 在 `workspace-tabs.js` 中新增：
  - `WORKSPACE_NOTE_VIEW_MODES`
  - `normalizeWorkspaceViewMode`
  - `getWorkspaceMainTabDefs`
  - `getWorkspaceViewModeLabel`
- 目标：主 tab / 视图标签改为单一来源，降低后续扩展时的分支散落。

### 3. 偏好读取时增加 viewMode 规范化
- 在 `preferences-service.js` 加入 `normalizeWorkspaceViewMode`。
- 解决历史脏值或未来扩展值导致界面不一致的问题。

### 4. Workspace 页面接入统一定义
- `routes/workspace/+page.svelte` 改为使用 `WORKSPACE_NOTE_VIEW_MODES`。
- `setViewMode` 时强制规范化后再保存偏好，避免写入非法状态。

## 受影响文件
- `src/lib/workspace/workspace-tabs.js`
- `src/lib/workspace/preferences-service.js`
- `src/routes/workspace/+page.svelte`
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
- `src/lib/strings.js`

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`

## 后续建议（Pass 2）
- 将 `workspace/+page.svelte` 继续拆分为：
  - 窗口壳层（window shell）
  - 笔记域（notes domain）
  - 专注域（focus domain）
- 把专注状态机从 `WorkspaceFocusHub.svelte` 抽到独立 service/store，降低组件耦合。
