# 2026-02-09 主窗口模式增强（渲染预览 / 待办 / 四象限）

## 背景
原主窗口列表只显示纯文本，不体现 Markdown 渲染结构；同时缺少面向复杂场景的视图模式。

## 目标
1. 主窗口列表显示渲染后的内容（而非源码）。
2. 增加主窗口模式，满足从“轻便记录”到“复杂管理”的切换。
3. 增加四象限（重要紧急）能力。
4. 增加待办导向视图。

## 功能实现
### 1) 主窗口渲染预览
- 文件：`src/routes/+page.svelte`
  - 引入 `renderNoteMarkdown`，为每条便笺生成 `renderedHtml`。
- 文件：`src/lib/components/panel/NotesSection.svelte`
  - 列表卡片内容由纯文本改为 `{@html note.renderedHtml}`。
  - 保留截断与紧凑样式，避免主窗口失控膨胀。

### 2) 多模式主窗口
- 文件：`src/routes/+page.svelte`
  - `NOTE_VIEW_MODES` 从 `active/archived/trash` 扩展为：
    - `active`
    - `todo`
    - `quadrant`
    - `archived`
    - `trash`
  - `canReorder` 限定为仅 `active` 模式可拖拽排序。
- 文件：`src/lib/components/panel/PanelHeader.svelte`
  - 视图 Tab 文案映射扩展，支持 `todo/quadrant`。

### 3) 四象限
- 后端持久化优先级（1~4）：
  - `src-tauri/src/notes.rs`
    - `Note` 新增 `priority`
    - 新建便笺默认 `priority=4`
  - `src-tauri/src/notes_service.rs`
    - 新增 `update_note_priority(...)`
  - `src-tauri/src/lib.rs`
    - 新增命令 `update_note_priority`
- 前端交互：
  - `src/lib/panel/use-note-commands.js`
    - 新增 `updatePriority(note, priority)`
  - `src/lib/components/panel/NotesSection.svelte`
    - 列表卡片新增 `Q1~Q4` 优先级按钮（点击循环）
    - 新增 `quadrant` 视图：四宫格按优先级分组展示

### 4) 待办模式
- 文件：`src/routes/+page.svelte`
  - `todo` 视图显示未归档、未删除便笺
  - 按完成状态分层（未完成在前）
- 文件：`src/lib/components/panel/NotesSection.svelte`
  - 保留已完成/未完成切换按钮，支持在待办模式中快速推进

## 文案
- 文件：`src/lib/strings.js`
- 新增：
  - `todo`
  - `quadrant`
  - `priority`
  - `quadrantQ1~Q4`
  - `quadrantQ1Desc~quadrantQ4Desc`
  - `emptyInQuadrant`

## 验证
1. `npm run check`：通过（0 errors / 0 warnings）
2. `cargo check`：通过（仅既有 warning，无新增错误）
