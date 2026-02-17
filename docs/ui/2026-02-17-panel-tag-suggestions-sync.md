# 简洁模式标签联想与工作台一致化

## 问题
简洁模式（主面板）新建笔记的标签输入仅出现 `Q1~Q4`，没有展示已有标签。

根因：
1. `PanelHeader.svelte` 的 `NoteTagsEditor` 已支持 `suggestions`。
2. 但 `src/routes/+page.svelte` 未提供 `noteTagOptions` 数据，也未绑定 `newNoteTags` 到创建命令链路。

## 调整
文件：`src/routes/+page.svelte`

1. 新增状态 `newNoteTags`，用于主面板创建时的标签输入。
2. 从 `notes[].tags` 聚合去重生成 `noteTagOptions`（最多 80 项）。
3. 在 `createNoteCommands(...)` 注入：
   - `getNewNoteTags`
   - `setNewNoteTags`
4. 给 `PanelHeader` 透传：
   - `bind:newNoteTags`
   - `noteTagOptions`

## 结果
主面板标签输入联想现在与 workstation 一致：
1. 同时显示 `Q1~Q4` 与历史标签。
2. 统一走 `NoteTagsEditor` 的输入/建议交互。
3. 新建笔记时标签可正确写入。

## 验证
1. `npm run check` 通过。
2. `cargo check` 通过（仅现有 dead_code warning）。
