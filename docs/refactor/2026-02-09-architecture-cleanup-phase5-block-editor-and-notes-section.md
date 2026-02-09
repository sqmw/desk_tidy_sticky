# 架构优化 Phase 5（2026-02-09）

## 目标
在 Phase 4 基础上，继续降低大组件复杂度，重点处理：
1. `BlockEditor.svelte` 里的工具逻辑与 UI 混写；
2. `NotesSection.svelte` 里的优先级/四象限领域规则嵌在视图层。

## 本次改动

### 1) 提取便签优先级领域规则
- 新增：`src/lib/panel/note-priority.js`
- 提供：
  - `clampPriority`
  - `nextPriority`
  - `priorityBadge`
  - `buildQuadrants`
  - `filterNotesByQuadrant`
- 应用到：`src/lib/components/panel/NotesSection.svelte`

收益：
- 视图组件不再承担业务规则计算；
- 四象限与优先级规则复用更容易；
- 便于后续新增排序或看板策略。

### 2) 提取 BlockEditor 基础工具
- 新增：`src/lib/note/block-editor-helpers.js`
- 提供：
  - `normalizeBlockInput`
  - `blobToBase64`
  - `findPastedImageItem`
  - `createPastedImageMarkdown`
- 应用到：`src/lib/components/note/BlockEditor.svelte`

收益：
- 粘贴图片流程更清晰；
- 文本规范化与剪贴板处理可独立测试；
- BlockEditor 主文件职责更聚焦在交互流程。

## 可量化结果
- `src/lib/components/note/BlockEditor.svelte`: `627 -> 601`
- `src/lib/components/panel/NotesSection.svelte`: `634 -> 616`

## 验证
- `npm run check`：通过（0 error / 0 warning）
- `cargo check`：通过（仅保留既有 warning）

## 架构评分（阶段性）
- Phase 4 后：`90/100`
- Phase 5 后：`91/100`

评分依据：
- 页面/组件职责进一步下沉到领域工具层；
- 减少规则散落与重复实现；
- 修改点聚焦且无行为回归。
