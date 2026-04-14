# Workspace Route Resize Bridge 拆分记录

日期：2026-04-14
阶段：P3 第三小步
状态：代码完成，待真实 Tauri UI 手工回归

## S：背景

在完成 viewport/layout 派生值和 route preferences bridge 下沉后，`src/routes/workspace/+page.svelte` 里仍保留一段明显的 resize 装配胶水：viewport left 读取、scale 安全值处理、inspector rect 映射、sidebar pointer 映射，以及 inspector/sidebar 布局写回。这部分逻辑和 route 模板无关，本质上是给 `createWorkspaceResizeController` 准备桥接参数。

## T：任务

本轮目标是把 route 级 resize bridge 抽出，让 `+page.svelte` 不再展开坐标换算细节，只保留 DOM 引用、当前 scale 和 state 写回入口。验收点：

- inspector resize 和 sidebar resize 参数形状保持不变。
- `pnpm check` 和 `git diff --check` 通过。

## A：行动

- 新增 `src/lib/workspace/controllers/workspace-route-resize-bridge.js`
  - 封装 viewport left / scale 的安全换算。
  - 封装 pointer `clientX` 到 workspace 内部坐标的映射。
  - 封装 inspector rect 的坐标换算。
  - 聚合 inspector/sidebar 布局写回边界。
- 更新 `src/routes/workspace/+page.svelte`
  - 先创建 `routeResizeBridge`。
  - 再将其传给 `createWorkspaceResizeController`。
  - 删除 route 中的重复坐标换算代码。

## R：结果

- `src/routes/workspace/+page.svelte` 从约 1318 行降到约 1297 行。
- route 入口继续向“状态装配 + controller 组装”收敛，resize 胶水已不再直接散落在入口文件中。

验证结果：

- `pnpm check`：通过，0 errors / 0 warnings。
- `git diff --check`：通过。

风险与回归关注：

- inspector 拖拽展开/收起阈值行为需要真实 UI 复测。
- sidebar resize 与双击复位宽度需要真实 UI 复测。
- 在 auto zoom 与手动 zoom 两种模式下，拖拽映射是否仍正确需要真实 UI 复测。
