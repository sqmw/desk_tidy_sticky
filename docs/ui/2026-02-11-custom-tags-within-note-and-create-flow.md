# 自定义标签（Tag）能力接入（2026-02-11）

## 目标

在保留四象限能力的前提下，支持真正的“标签”模型：

1. 标签可在文档内直接新建/删除。
2. 创建笔记时可直接输入标签。
3. 四象限作为系统字段保留，不与自定义标签冲突。

## 数据模型

文件：`src-tauri/src/notes.rs`

新增字段：

- `tags: Vec<String>`

约束：

- 旧数据兼容：`#[serde(default)]`。
- 空数组不序列化：`skip_serializing_if = "Vec::is_empty"`。

## 后端命令

### 1) 创建笔记支持 tags

文件：

- `src-tauri/src/lib.rs`
- `src-tauri/src/notes_service.rs`

`add_note` 新增参数：

- `tags: Option<Vec<String>>`

### 2) 新增更新标签命令

文件：

- `src-tauri/src/lib.rs`
- `src-tauri/src/notes_service.rs`

新增命令：

- `update_note_tags(id, tags, sort_mode)`

### 3) 标签归一化

`notes_service` 增加 `normalize_tags`：

- 去空白
- 去前缀 `#`
- 忽略大小写去重
- 过滤空标签

## 前端交互

### 1) 创建时可输入标签

文件：

- `src/lib/components/workspace/toolbar/WorkspaceCreateBar.svelte`
- `src/lib/components/note/NoteTagsEditor.svelte`
- `src/lib/panel/use-note-commands.js`
- `src/routes/workspace/+page.svelte`
- `src/lib/workspace/controllers/workspace-inspector-actions.js`

行为：

- 输入标签后按回车或逗号创建标签。
- 创建成功后，输入标签清空（防止污染下一条）。

### 2) 文档内部可编辑标签（Anytype 风格属性区）

文件：

- `src/lib/components/note/NoteTagBar.svelte`
- `src/lib/components/workspace/WorkspaceNoteInspector.svelte`
- `src/routes/workspace/+page.svelte`
- `src/routes/note/[id]/+page.svelte`

行为：

- 标签区直接增删标签，实时持久化。
- 四象限（系统）与标签（自定义）分别展示。

## 文案

文件：`src/lib/strings.js`

新增键：

- `quadrantTag`
- `tags`
- `tagsPlaceholder`

## 验证

- `npm run check`：通过（0 error / 0 warning）
- `cargo check`：通过（仅历史 dead_code 警告）

## 结论

当前模型已从“只有四象限”升级为“系统四象限 + 用户标签”的双轨模型，满足：

- 快速分类（Q1~Q4）
- 自定义语义组织（标签）
