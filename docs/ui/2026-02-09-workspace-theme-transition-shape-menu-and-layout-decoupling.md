# Workspace 主题切换动画与形状选择（2026-02-09）

## 需求
1. 主题切换动画需要更优雅（圆形覆盖或爱心形状）；
2. 支持右键选择动画形式；
3. 在实现功能的同时，降低页面耦合，改善结构清晰度。

## 实现概览

### 1) 主题切换动效（圆形/爱心）
- 新增组件：`src/lib/components/workspace/WorkspaceThemeTransition.svelte`
- 动画策略：
  - `circle`：基于 `clip-path: circle(...)` 的扩散覆盖动画；
  - `heart`：基于心形 `clip-path` + `scale` 放大覆盖动画。
- 触发方式：点击顶部主题按钮时，以按钮中心作为扩散起点。

### 2) 右键选择形状
- 在顶部主题按钮加入 `contextmenu` 交互：
  - 右键弹出形状菜单（圆形扩散 / 爱心扩散）；
  - 选择后即时生效并持久化。
- 对应组件：`src/lib/components/workspace/WorkspaceWindowBar.svelte`

### 3) 偏好持久化
- 新增前端偏好字段：`workspaceThemeTransitionShape`
- 读取：workspace 页面初始化时从 `get_preferences` 读取；
- 保存：选择形状后通过 `set_preferences` 写回。

## 结构整理（面向 90 分目标的拆分）

### 拆分点 1：布局尺寸计算逻辑抽离
- 新增：`src/lib/workspace/layout-resize.js`
- 抽离函数：
  - `calcSidebarWidth`
  - `calcInspectorLayout`
- 目的：从 `src/routes/workspace/+page.svelte` 移除重复的分栏边界计算，减少页面职责。

### 拆分点 2：主题转场 UI 抽离
- 新增独立组件承载动画渲染：`WorkspaceThemeTransition.svelte`
- 目的：避免在页面中夹杂大量动画 CSS 与状态细节。

## 影响文件
- `src/routes/workspace/+page.svelte`
- `src/lib/components/workspace/WorkspaceWindowBar.svelte`
- `src/lib/components/workspace/WorkspaceThemeTransition.svelte` (新增)
- `src/lib/workspace/layout-resize.js` (新增)
- `src/lib/strings.js`

## 验证
- 左键主题按钮：可看到形状扩散动画并完成主题切换；
- 右键主题按钮：可切换动画形状；
- 形状选择重启后仍保持；
- `npm run check` 与 `cargo check` 通过。
