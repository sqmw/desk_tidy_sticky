# 创建即标记标签（优先级）改进（2026-02-11）

## 问题

用户在创建笔记时无法直接选择标签（四象限优先级），只能创建后再逐条点击切换，操作成本高、视觉反馈弱。

## 改进目标

1. 创建时可直接设置标签（`未标记 / Q1 / Q2 / Q3 / Q4`）。
2. 默认保持 `未标记`，避免误把普通笔记强制打上四象限标签。
3. 简洁模式与工作台模式行为一致。

## 实现内容

### 1) 新增通用创建标签选择组件

- `src/lib/components/note/CreateTagSelect.svelte`

职责：

- 仅负责展示和选择标签。
- 输出值为 `null | 1 | 2 | 3 | 4`。
- 支持 `compact` 紧凑模式，兼容简洁窗口。

### 2) 创建链路支持优先级直写

- `src/lib/panel/use-note-commands.js`

改动：

- `saveNote` 增加读取创建标签的能力。
- 调用 `add_note` 时带上 `priority`。
- 创建成功后清空输入文本，并重置为 `未标记`。

### 3) 后端 add_note 支持可选 priority

- `src-tauri/src/lib.rs`
- `src-tauri/src/notes_service.rs`

改动：

- Tauri `add_note` 命令新增 `priority: Option<u8>`。
- 保存前自动钳制到 `1..4`。
- 不传则保持 `None`（未标记）。

### 4) 两种窗口都接入创建标签

- 工作台创建栏：
  - `src/lib/components/workspace/toolbar/WorkspaceCreateBar.svelte`
  - `src/lib/components/workspace/WorkspaceToolbar.svelte`
  - `src/routes/workspace/+page.svelte`
  - `src/lib/workspace/controllers/workspace-inspector-actions.js`

- 简洁模式创建栏：
  - `src/lib/components/panel/PanelHeader.svelte`
  - `src/routes/+page.svelte`

说明：

- 工作台“写长文档”同样继承当前标签选择。
- 创建完成后重置为 `未标记`，避免连续误标。

## 用户体验结果

1. 创建路径从“先建后改”变成“一步完成”。
2. 普通日记/杂记不会被默认打入 Q1~Q4。
3. 交互一致性更高，减少模式切换学习成本。

## 验证

- `npm run check`：通过（0 error / 0 warning）
- `cargo check`：通过（仅历史 dead_code 警告）
