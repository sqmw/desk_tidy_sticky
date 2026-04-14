# Workspace Route Viewport Layout 拆分记录

日期：2026-04-14
阶段：P3 第一小步
状态：代码完成，待真实 Tauri UI 手工回归

## S：背景

`src/routes/workspace/+page.svelte` 目前仍承担大量装配职责，其中 viewport 尺寸、DPR、自适应缩放、字体缩放、stage layout、sidebar layout 的派生值都直接堆在 route 内。这部分逻辑本身是纯计算，不需要和 route 状态写入耦合，继续保留在入口文件里会增加后续拆 `resize` 和 `state factory` 的上下文负担。

## T：任务

本轮目标是把 viewport/layout 纯计算抽到独立 helper，让 route 只负责提供输入 state 并消费结果，不改变布局行为与缩放行为。验收点：

- `workspaceLayoutScale`、`workspaceTextScale`、`stageLayout`、`sidebarLayout`、`sidebarCompact` 的结果保持一致。
- `pnpm check` 和 `git diff --check` 通过。

## A：行动

- 新增 `src/lib/workspace/layout/workspace-viewport-layout.js`
  - 封装 adaptive scale 计算。
  - 封装 zoom mode 下的最终 layout scale 计算。
  - 封装 text scale 计算。
  - 聚合 `resolveWorkspaceStageLayout` 与 `resolveSidebarLayout`。
- 更新 `src/routes/workspace/+page.svelte`
  - 移除 route 内自适应缩放、字体缩放、stage/sidebar layout 的展开实现。
  - 统一改为 `viewportLayout` 派生对象。
  - route 继续只暴露现有变量名给模板层，避免模板大改。

## R：结果

- `src/routes/workspace/+page.svelte` 从约 1349 行降到约 1324 行。
- route 入口的“视口计算”职责开始向 `src/lib/workspace/layout` 下沉，为后续继续拆 resize 映射和 page state factory 预留边界。

验证结果：

- `pnpm check`：通过，0 errors / 0 warnings。
- `git diff --check`：通过。

风险与回归关注：

- auto zoom 模式下，窗口尺寸变化后的缩放值需要真实 UI 复测。
- 高 DPR 屏幕下 sidebar collapsed / expanded 时的缩放补偿需要真实 UI 复测。
- stage layout / sidebar layout 的断点表现需要在桌面窗口拉伸时复测。
