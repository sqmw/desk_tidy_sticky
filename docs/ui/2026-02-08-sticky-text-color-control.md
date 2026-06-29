# 2026-02-08 Sticky 文字颜色设置

## 目标
支持便笺文字颜色自定义，提升在不同背景/壁纸下的可读性。

## 功能
1. 新增 `textColor` 持久化字段。  
2. 默认值：`#1f2937`。  
3. 在贴纸底部工具栏新增文字色按钮 `A`，点击展开色板选择。  
4. 编辑态与预览态统一使用 `textColor`。
5. 2026-06-29 起，若当前 active block 的 textarea 内存在选中文字，`A` 色板优先给选区写入内容级颜色；若没有选区，才继续设置整张贴纸的默认文字色。

## 当前行为契约
- 整体文字色仍由 note 的 `textColor` 字段控制，并通过 `--note-text-color` 作为未单独标色文本的默认颜色。
- 选区文字色写回 Markdown 正文，格式为安全白名单内的 `<span style="color: ...">选中文字</span>`。
- active block 进入编辑态时，不向用户展示内部 `<span>` 标签；编辑器显示真实内容文本，并在提交时把颜色区间重新序列化回 Markdown。
- 选区上色只作用于当前 active block；应用后会提交该 block，让用户立即看到渲染后的颜色效果。
- 当前未引入富文本 document model，也不新增私有 JSON 字段。

## 后端改动
- `src-tauri/src/notes.rs`
  - 新增 `DEFAULT_NOTE_TEXT_COLOR`
  - `Note` 新增 `text_color`
  - 新建便笺写入默认文字色

- `src-tauri/src/notes_service.rs`
  - 新增 `update_note_text_color(...)`

- `src-tauri/src/lib.rs`
  - 新增命令 `update_note_text_color`

## 前端改动
- `src/routes/note/[id]/+page.svelte`
  - 新增文字色状态、按钮、色板、保存逻辑
  - `--note-text-color` 应用于 `.editor` 与 `.preview-text`
  - 2026-06-29：`onSetTextColor` 优先调用 `BlockNoteContent.applySelectedTextColor(color)`，没有选区时 fallback 到 `update_note_text_color`
- `src/lib/components/note/BlockNoteContent.svelte`
  - 暴露 `applySelectedTextColor(color)`，对当前 active block 选区包裹安全 `span` 并按 block range 回写
  - active block 编辑态维护 `纯文本 draft + inline color ranges`，避免把 `<span>` 标签暴露在 textarea 中
- `src/lib/markdown/inline-style.js`
  - 统一维护安全颜色校验、选区上色、编辑态解析和 Markdown 序列化逻辑

- `src/lib/strings.js`
  - 新增文案 `textColor`（中英文）

## 验证
1. `cargo check` 通过（仅既有 warning）。  
2. `npm run check` 通过（0 errors / 0 warnings）。
