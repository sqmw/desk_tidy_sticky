# 2026-02-15 Workspace 休息控制与番茄卡片同容器化（Tab 切换）

## 背景
- 现状：点击“休息控制”后，会在番茄卡片下方再出现一个独立小面板，视觉上像“新开一个小窗口”。
- 目标：与番茄钟复用同一小窗口区域，像 tab 一样切换，不再额外追加第二块面板。

## 方案
- 将 `WorkspaceFocusTimer` 作为“单容器承载”组件：
  - 顶部改为双 tab：`Pomodoro` / `Break`
  - `Pomodoro` tab 显示原计时与配置内容
  - `Break` tab 在同一容器内渲染休息控制
- `WorkspaceFocusHub` 不再在计时卡片下方渲染 `WorkspaceBreakControlBar`，改为通过 snippet 传入 `WorkspaceFocusTimer` 内部渲染。

## 关键改动
- `src/lib/components/workspace/focus/WorkspaceFocusTimer.svelte`
  - 新增 `breakPanel` snippet-prop
  - 头部交互改为 tab 切换
  - `showBreakPanel` 时在同卡片内渲染 `breakPanel`
  - 移除“休息按钮仅切换下方面板”的旧行为
- `src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 删除 `.timer-break-panel` 独立渲染块
  - 将 `WorkspaceBreakControlBar` 通过 `{#snippet breakPanel()}` 传给 `WorkspaceFocusTimer`
  - 切换到 `Break` tab 时关闭 `showConfig`，避免配置区与休息区并行显示

## 验证
- `npm run check`：通过（0 errors / 0 warnings）
- `cargo check`：通过（仅历史 warning）

