# 2026-02-09 简洁模式拖拽幽灵卡片内容缺失

## 现象
手动排序时，拖拽中的幽灵卡片只显示少量字段（如日期），正文基本不显示。

## 根因
- 文件：`src/routes/+page.svelte`
- `draggedNote` 之前从 `dragPreviewNotes/visibleNotes` 取值，这些是原始 note 数据，不包含 `renderedHtml`。
- 幽灵卡片模板依赖 `draggedNote.renderedHtml`，因此拖拽时正文丢失。

## 修复
- 将 `draggedNote` 数据源改为 `renderedNotes`（已含 `renderedHtml`）。
- 这样拖拽预览与列表显示保持一致，正文和样式都完整。

## 验证
1. `npm run check`：通过（0 errors / 0 warnings）
2. `cargo check`：通过（仅既有 warning）
