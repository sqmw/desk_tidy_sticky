# 2026-02-09 主窗口分离：简洁窗口 + 独立工作台窗口

## 结论
本次不再在原简洁主窗口上叠加复杂模式，而是采用“独立窗口”方案：

1. `main`：保留现有简洁主窗口（原交互不变）。
2. `workspace`：新增独立复杂工作台窗口（全新样式与布局）。

## 核心实现
### 1) 窗口切换工具
- 文件：`src/lib/panel/switch-panel-window.js`
- 功能：
  - 从 `main` 切换到 `workspace`：如不存在则创建新窗口并显示。
  - 从 `workspace` 切换回 `main`：显示主窗口并隐藏当前窗口。
  - 创建 `workspace` 后调用 `apply_window_no_snap_by_label`，禁用 Aero Snap 干扰。

### 2) 简洁窗口保持原架构
- 文件：`src/routes/+page.svelte`
- 仅新增一个“打开工作台”动作（窗口级切换入口）。
- 原有简洁列表、拖拽排序、头部结构未改成复杂布局。

### 3) 独立工作台窗口页面
- 文件：`src/routes/workspace/+page.svelte`
- 新窗口路由，采用独立布局：
  - 左侧：视图导航 + 窗口操作
  - 右侧：搜索/新增/排序 + 工作台卡片区
- 复用既有数据命令体系（`createNoteCommands`），保持数据一致性。

### 4) 工作台内容承载组件
- 文件：`src/lib/components/panel/WorkbenchSection.svelte`
- 承载高密度卡片展示与四象限展示，不挤占简洁窗口组件职责。

### 5) 文案
- 文件：`src/lib/strings.js`
- 新增：
  - `workspaceTitle`
  - `workspaceHint`
  - `switchToWorkspace`
  - `switchToCompact`

## 用户体验收益
1. 简洁用户不受影响（默认主窗口保持轻量）。
2. 重度用户可切换到高信息密度工作台。
3. 两窗口共享同一份数据，不引入数据分叉。

## 验证
1. `npm run check`：通过（0 errors / 0 warnings）。
2. `cargo check`：通过（仅既有 warning）。
