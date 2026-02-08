# 2026-02-08 Sticky 文字颜色设置

## 目标
支持便笺文字颜色自定义，提升在不同背景/壁纸下的可读性。

## 功能
1. 新增 `textColor` 持久化字段。  
2. 默认值：`#1f2937`。  
3. 在贴纸底部工具栏新增文字色按钮 `A`，点击展开色板选择。  
4. 编辑态与预览态统一使用 `textColor`。

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

- `src/lib/strings.js`
  - 新增文案 `textColor`（中英文）

## 验证
1. `cargo check` 通过（仅既有 warning）。  
2. `npm run check` 通过（0 errors / 0 warnings）。
