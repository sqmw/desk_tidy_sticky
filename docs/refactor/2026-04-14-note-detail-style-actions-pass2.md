# Sticky Note 详情页样式动作拆分第二轮

日期：2026-04-14
范围：`src/routes/note/[id]/+page.svelte`、`src/lib/note/note-style-actions.js`
状态：已完成代码拆分并通过验证

## 背景

P0 第一轮已把 note window load/command helper 和窗口拖拽 controller 从详情页中拆出。详情页中剩余一块高内聚逻辑是贴纸样式动作：背景色、文字色、透明度、毛玻璃、picker input、wheel 快调、延迟保存与弹层值提示隐藏。

本轮继续按保守边界拆分样式动作，不改 UI 结构、不改 Tauri 命令名称、不改交互阈值。

## 拆分内容

- 新增 `src/lib/note/note-style-actions.js`
  - 提供 `createNoteStyleActions` controller。
  - 收拢背景色、文字色、透明度、毛玻璃更新命令。
  - 收拢 opacity/frost 草稿值 clamp、wheel 调整、picker input。
  - 收拢 opacity/frost 延迟保存 timer 与值提示隐藏 timer。
  - 提供 `dispose()`，由详情页卸载时统一清理样式相关 timer。
- 更新 `src/routes/note/[id]/+page.svelte`
  - 移除样式动作函数与 timer 变量。
  - 使用 getter/setter 回调把 Svelte 状态接入 controller。
  - `NoteToolbar` 的样式相关 handler 统一指向 `noteStyleActions`。

## 行为约束

- `update_note_color`、`update_note_text_color`、`update_note_opacity`、`update_note_frost` 命令名保持不变。
- `sortMode` 仍由上一轮的 `invokeNoteCommand` 统一保持为 `custom`。
- opacity clamp 保持 `0.35..1`。
- frost clamp 保持 `0..1`。
- wheel step 保持 `0.02`。
- 延迟保存保持 `60ms`。
- 值提示隐藏保持 `800ms`。

## 回归关注点

- 背景色 picker 和预设色切换。
- 文字色 picker 和预设色切换。
- 透明度 slider 与图标滚轮。
- 毛玻璃 slider 与图标滚轮。
- 样式改动后 note state、draft state 和窗口显示是否同步。

## 验证

- `pnpm check`：通过，`svelte-check` 0 error / 0 warning。
- `git diff --check`：通过。
- 未执行真实 Tauri 窗口手工回归；颜色、透明度、毛玻璃仍需后续手工抽测。

## 后续

- 继续 P0 第三轮：拆 `note-editor-actions.js`，覆盖图片粘贴、命令建议、命令插入、键盘事件。
- 若 editor 拆分引入过多回调，先拆纯函数和 clipboard/image helper，不强行一次性 controller 化。
