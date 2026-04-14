# Workspace Route Note Bridge 拆分记录

日期：2026-04-14
阶段：P3 第四小步
状态：代码完成，待真实 Tauri UI 手工回归

## S：背景

在完成 viewport/layout、preferences、resize 三轮拆分后，`src/routes/workspace/+page.svelte` 里仍然保留大量 note / new-note / inspector 状态桥接代码，主要用于给 `createNoteCommands`、`createWorkspaceInspectorActions`、`createWorkspaceNoteViewActions` 组装依赖对象。这部分代码并不直接表达页面结构，而是 route 与 controller 之间的胶水。

## T：任务

本轮目标是把 note / inspector 的 route bridge 单独抽出，让 `+page.svelte` 不再内联大段 getter/setter 配置。验收点：

- `createNoteCommands`、`createWorkspaceInspectorActions`、`createWorkspaceNoteViewActions` 的行为保持不变。
- `pnpm check` 和 `git diff --check` 通过。

## A：行动

- 新增 `src/lib/workspace/controllers/workspace-route-note-bridge.js`
  - 封装 note commands config。
  - 封装 inspector actions config。
  - 封装 note view actions config。
- 更新 `src/routes/workspace/+page.svelte`
  - 新增 `routeNoteBridge`。
  - 将 route 内联的 note/new-note/inspector 配置迁移为 bridge 输出。
  - 对 `loadNotes` / `savePrefs` 使用延迟闭包，避免初始化顺序把逻辑重新写回 route。

## R：结果

- `src/routes/workspace/+page.svelte` 从约 1297 行降到约 1276 行。
- route 入口的 note / inspector 胶水显著减少，文件更接近“state + controller 组装 + 模板绑定”的结构。

验证结果：

- `pnpm check`：通过，0 errors / 0 warnings。
- `git diff --check`：通过。

风险与回归关注：

- inspector 打开、编辑、关闭、长文档草稿路径需要真实 UI 复测。
- 新建 note、tag/priority 草稿重置、trash/archive 视图切换需要真实 UI 复测。
- note view mode / initial view mode / language 切换的持久化路径需要真实 UI 复测。
