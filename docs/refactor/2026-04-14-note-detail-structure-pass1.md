# Sticky Note 详情页结构整理第一轮

日期：2026-04-14
范围：`src/routes/note/[id]/+page.svelte`、`src/lib/note/note-window-actions.js`、`src/lib/note/note-window-drag.js`
状态：已完成代码拆分并通过验证

## 背景

`src/routes/note/[id]/+page.svelte` 同时承载详情页视图状态、Tauri 窗口拖拽、note 命令 invoke 参数拼装、tag suggestions 加载、编辑器粘贴与命令建议等职责。文件继续膨胀会增加后续拆分样式动作、编辑器动作时的回归风险。

本轮按保守边界先拆出两个低耦合领域 helper，不改变 UI 布局、不改变 Tauri 命令名称、不改变保存节流参数。

## 拆分内容

- `src/lib/note/note-window-actions.js`
  - 统一 `load_notes` 返回值归一化。
  - 提供 `findNoteById`、`resolveNoteId`。
  - 提供 `loadNoteWindowSnapshot`，集中加载当前 note、草稿透明度/毛玻璃值、tag suggestions。
  - 提供 `invokeNoteCommand`，统一 note 命令的 `id`、`sortMode` 与额外 payload 拼装。
- `src/lib/note/note-window-drag.js`
  - 承载 manual window drag 的内部状态。
  - 统一 pointer down/move/up/cancel 与 Tauri `setPosition` 更新。
  - 通过 getter 读取全局操作状态与 `isEditing`，避免 helper 持有 Svelte 状态对象。
- `src/routes/note/[id]/+page.svelte`
  - 移除窗口拖拽内部变量与拖拽函数。
  - 将 topmost、wallpaper、颜色、透明度、毛玻璃、done/archive/unpin/trash/priority/tags 的命令参数拼装切到 `invokeNoteCommand`。
  - 移除本页中旧 `load_notes` 与 event payload 的 `@ts-ignore`。

## 行为约束

- 便签窗口拖拽可触发区域保持不变：
  - 编辑态只允许 toolbar 拖拽。
  - 预览态允许 preview text 与 toolbar 拖拽。
  - button/input/select/textarea/tag bar/color/opacity/frost popover 不触发拖拽。
- note 命令仍使用 `sortMode: "custom"`。
- 透明度保存节流仍为 `60ms`。
- 文本保存节流仍为 `500ms`。

## 回归关注点

- 编辑保存和图片粘贴。
- 命令建议弹层与命令插入。
- 窗口拖拽开始、移动、释放、取消。
- topmost、wallpaper、全局操作状态同步。
- 背景色、文字色、透明度、毛玻璃。
- done/archive/unpin/trash/priority/tags。

## 验证

- `pnpm check`：通过，`svelte-check` 0 error / 0 warning。
- `git diff --check`：通过。
- 未执行真实 Tauri 窗口手工回归；拖拽、topmost、wallpaper、全局操作仍需后续手工抽测。

## 后续

- 继续 P0 第二轮：抽 `note-style-actions.js` 或 `note-editor-actions.js`，优先选择对状态耦合更低的一侧。
- 若第二轮发现 view 状态过多，可先引入小型 state adapter，再拆更大 controller，避免一次性重写。
