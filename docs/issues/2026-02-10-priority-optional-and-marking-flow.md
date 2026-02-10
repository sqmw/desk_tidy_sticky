# 优先级默认强制 Q1~Q4 问题修复（2026-02-10）

## 问题
- 所有新建笔记默认都带 `Q4`，导致普通记录（如日记、随手笔记）也被强制贴上四象限标签，体验不合理。
- 交互上只能在 `Q1~Q4` 循环，无法“取消优先级标记”。

## 修复目标
- 优先级改为可选字段：普通笔记可完全不标记四象限。
- 保留快速标记能力，并支持一键取消标记。

## 实现
1. 数据层
- 新建笔记默认 `priority = None`（不再默认 `Q4`）。
- 新增后端命令：`clear_note_priority`，用于清空优先级。

2. 前端命令层
- `updatePriority(note, priority)` 支持 `priority = null`：
  - `null` -> 调用 `clear_note_priority`
  - `1..4` -> 调用 `update_note_priority`

3. 视图层
- 不再把空优先级强制渲染为 `4`。
- 卡片顶部仅在有优先级时显示 `Q1~Q4` 标签。
- 优先级按钮改为可循环：
  - `未标记 -> Q1 -> Q2 -> Q3 -> Q4 -> 未标记`
- 文案补充：`priorityUnassigned`（中英文）。

## 影响文件
- `src-tauri/src/notes.rs`
- `src-tauri/src/notes_service.rs`
- `src-tauri/src/lib.rs`
- `src/lib/panel/use-note-commands.js`
- `src/lib/panel/note-priority.js`
- `src/lib/components/panel/WorkbenchSection.svelte`
- `src/lib/components/panel/NotesSection.svelte`
- `src/routes/+page.svelte`
- `src/routes/workspace/+page.svelte`
- `src/lib/strings.js`

## 验证
- `npm run check` 通过（0 error / 0 warning）
- `cargo check` 通过（仅既有 warning，无新增编译错误）
