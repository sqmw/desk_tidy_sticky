# 文档内直接修改标签（Anytype 风格属性区）（2026-02-11）

## 目标

支持在“文档内部”直接修改标签（优先级），而不是必须回到卡片列表逐条切换。

## 改动摘要

1. 新增通用属性条组件：
   - `src/lib/components/note/NoteTagBar.svelte`
2. 复用创建时标签选择控件并扩展回调：
   - `src/lib/components/note/CreateTagSelect.svelte`
3. 工作台右侧详情支持直接改标签：
   - `src/lib/components/workspace/WorkspaceNoteInspector.svelte`
   - `src/routes/workspace/+page.svelte`
4. 长文档页面（`/note/[id]`）支持直接改标签：
   - `src/routes/note/[id]/+page.svelte`

## 交互规则

1. 标签选择项：`未标记 / Q1 / Q2 / Q3 / Q4`。
2. 修改标签后立即落盘，不需要额外保存。
3. 在文档页面点击标签区域不会触发窗口拖动。

## 设计说明

- 属性条固定在文档内容区域上方，保持可见性。
- 不侵入正文，不影响 Markdown 编辑焦点。
- 与工作台创建栏的标签模型保持一致，降低学习成本。

## 技术点

- 长文档页通过命令直调：
  - `update_note_priority`
  - `clear_note_priority`
- 工作台详情复用现有 `updatePriority` 动作，维持数据单一入口。

## 验证

- `npm run check`：通过（0 error / 0 warning）
- `cargo check`：通过（存在历史 dead_code 警告）
