# Project TODO

状态：活跃主 TODO

维护原则：只记录当前主线、阶段状态、阻塞与专题索引；详细方案放入对应专题文档。

## Active

### Single Active Block Editor

状态：in_progress

优先级：high

目标：把当前“整篇笔记编辑 / 整篇笔记预览”改为“最多一个 Markdown block 处于编辑态，其他 block 保持渲染态”。

关联文档：

- `docs/architecture/2026-06-29-single-active-block-editor.md`
- `docs/product/2026-06-29-note-todo-blocks.md`

阶段：

| 阶段 | 状态 | 验收 |
|---|---|---|
| Phase 1：Block parser + 渲染等价 | done | `renderNoteMarkdown` 行为基本等价，Todo block 交互不回退 |
| Phase 2：工作台 inspector 单活跃块编辑 | pending | 点击 block 仅该 block 编辑，其他 block 渲染 |
| Phase 3：便笺窗口接入 | pending | 复用同一块内容组件，避免拖拽 / 置顶 / 穿透冲突 |
| Phase 4：块操作增强 | pending | 插入、拆分、合并、类型切换按需补齐 |

当前下一步：

1. 新增 `BlockNoteContent.svelte`，以 `parseMarkdownBlocks(text)` 作为渲染输入。
2. 先在工作台 inspector 接入单活跃块编辑。
3. 跑 `make check` / `make build` 验证工作台详情回归。

风险：

- 第一阶段 block id 不持久化，外部同步修改时需要通过 original range 校验避免覆盖。
- 不恢复旧 `contenteditable BlockEditor`，避免历史 caret 跳动问题回归。

## Done

### 2026-06-29：Implement Markdown block parser foundation

结果：新增 Markdown block parser / block renderer / block range ops；`renderNoteMarkdown` 公共 API 保持不变，内部改为 `expandNoteCommands -> parseMarkdownBlocks -> renderMarkdownBlocks`。

验证：`make check-frontend`、`make check`、`make build`，Node alias loader 样例验证 block 类型、Todo 绝对行号、range replace。

提交：待提交。

### 2026-06-29：Document single active block editor design

结果：完成 Markdown-first 单活跃块编辑方案文档，明确当前项目还没有完整 block model，推荐以 derived block facade + range replace 方式推进。

验证：`git diff --check`。

提交：`35d2b06 Document single active block editor design`。
