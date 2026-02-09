# 2026-02-09 简洁模式滚动条瘦身

## 问题
简洁模式下，横向与纵向滚动条视觉过粗，影响紧凑体验。

## 处理
- 文件：`src/lib/components/panel/NotesSection.svelte`
- 调整内容：
  1. 列表区滚动条尺寸由隐藏/默认行为改为细条样式（`7px`）。
  2. 四象限容器滚动条统一同样细条样式（`7px`）。
  3. 增加 track/thumb/hover 的统一视觉，避免“粗灰条”观感。

## 验证
1. `npm run check`：通过（0 errors / 0 warnings）
2. `cargo check`：通过（仅既有 warning）
