# 2026-02-07 架构整理（Phase 1）

## 背景
本次目标是处理主页面文件过大、职责混杂、重复逻辑过多的问题，优先保证行为不变并提升可维护性。

## 本次调整重点

### 1. 前端主页面拆分（单一职责）
- 原先 `src/routes/+page.svelte` 同时承担：
  - 顶部工具栏与搜索区 UI
  - 便签列表与拖拽排序 UI
  - 编辑弹窗与设置弹窗 UI
  - 页面状态编排与事件监听
- 现已拆分为 4 个组件：
  - `src/lib/components/panel/PanelHeader.svelte`
  - `src/lib/components/panel/NotesSection.svelte`
  - `src/lib/components/panel/EditDialog.svelte`
  - `src/lib/components/panel/SettingsDialog.svelte`
- `src/routes/+page.svelte` 仅保留状态管理、命令编排、窗口/事件同步，降低视图层耦合。

### 2. Tauri 入口逻辑去重
- 文件：`src-tauri/src/lib.rs`
- 重构点：
  - 提取 `parse_sort_mode`，消除多处重复 `match`。
  - 清理 `update_tray_texts` 的冗余注释与空分支。
  - 删除 `invoke_handler` 重复注册（`pin/unpin_window_*` 重复两次）。

### 3. 体积变化（核心文件）
- `src/routes/+page.svelte`: `1989 -> 734` 行
- `src-tauri/src/lib.rs`: `405 -> 332` 行
- 新增组件文件承接 UI 职责，降低单文件复杂度。

## 设计原则落实
- 单一职责原则（SRP）：UI 区块按功能拆分到独立组件。
- 开闭原则（OCP）：后续新增头部/列表/弹窗功能可在子组件扩展，减少对主页面修改。
- 依赖倒置思想：主页面只编排回调与状态，不直接承载所有具体 UI 实现。

## 验证结果
- 前端：`npm run build` 通过。
- Rust：`cargo check` 通过（存在历史遗留 warning，未新增错误）。

## 后续建议（Phase 2）
- `src/routes/+page.svelte` 仍承担较多业务编排（734 行），建议继续拆到：
  - `src/lib/panel/use-note-commands.js`（note 命令调用）
  - `src/lib/panel/use-drag-reorder.js`（拖拽重排）
  - `src/lib/panel/use-window-sync.js`（置顶窗口同步）
- 这一步会继续降低主页面复杂度，并使测试粒度更细。
