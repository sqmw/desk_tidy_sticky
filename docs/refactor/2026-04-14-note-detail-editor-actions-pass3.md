# Sticky Note 详情页编辑器动作拆分第三轮

日期：2026-04-14
范围：`src/routes/note/[id]/+page.svelte`、`src/lib/note/note-editor-actions.js`
状态：已完成代码拆分并通过验证

## 背景

P0 前两轮已经拆出 note window helper、窗口拖拽 controller 和样式动作 controller。详情页剩余的高耦合逻辑集中在编辑器侧：文本输入保存 timer、图片粘贴上传、命令 token 识别、命令插入、键盘导航与命令弹层状态。

本轮按保守边界拆出编辑器动作 controller，仍把 `commandSuggestions` 和 `commandSuggestionItems` 的 `$derived` 留在 Svelte 页面中，避免普通 JS helper 依赖 Svelte 派生状态。

## 拆分内容

- 新增 `src/lib/note/note-editor-actions.js`
  - 提供 `createNoteEditorActions` controller。
  - 收拢编辑输入后的 `500ms` 保存 timer。
  - 收拢 clipboard 图片读取、`save_clipboard_image` 调用和 markdown image 插入。
  - 收拢 slash/command token 识别、命令查询更新和 active index 重置。
  - 收拢命令插入、markdown command 展开、光标恢复。
  - 收拢 command popover 键盘导航：ArrowUp、ArrowDown、Enter、Tab、Escape。
  - 提供 `dispose()`，由详情页卸载时统一清理编辑保存 timer。
- 更新 `src/routes/note/[id]/+page.svelte`
  - 移除 `blobToBase64`、`handleInput`、`onEditorPaste`、`updateCommandSuggestions`、`applyCommandSuggestion`、`onEditorKeydown`。
  - 移除页面对 `convertFileSrc`、`expandNoteCommands`、`source-command` helper 的直接依赖。
  - `SourceEditorPane` 的编辑器事件统一指向 `noteEditorActions`。

## 行为约束

- 文本保存节流保持 `500ms`。
- 图片粘贴仍调用 `save_clipboard_image`。
- 粘贴生成的 markdown 仍为 `![pasted-ISO_TIMESTAMP](converted_src)`。
- 命令建议仍由页面基于 `commandQuery` 派生，helper 只负责更新 query/active/visible 状态。
- 命令插入后仍调用 `expandNoteCommands`，并按原逻辑恢复光标位置。

## 回归关注点

- 文本输入后延迟保存。
- 图片粘贴、图片路径转换和 markdown 插入。
- 命令建议弹层展示和隐藏。
- ArrowUp / ArrowDown 导航。
- Enter / Tab 应用命令。
- Escape 关闭命令弹层。

## 验证

- `pnpm check`：通过，`svelte-check` 0 error / 0 warning。
- `git diff --check`：通过。
- 未执行真实 Tauri 窗口手工回归；图片粘贴、命令建议和编辑保存仍需后续手工抽测。

## 后续

- P0 剩余工作可继续收敛 `syncAfterCommand` / `save` 的命令边界，或先做真实 Tauri 手工回归后再进入 P1。
- 如果继续拆 `save`，优先保持 `update_note_text` 的可读性，不要把所有 note 命令重新堆进单个万能 controller。
