# 单活跃块编辑架构调研与方案

日期：2026-06-29

状态：Phase 1 已落地，Phase 2 工作台首版已落地，Phase 3 便笺窗口首版已落地

范围：便笺窗口、工作台笔记 inspector、Markdown 渲染与编辑架构

## Situation

当前笔记内容有两种全局状态：

1. 查看整个贴纸 / 笔记：所有内容渲染。
2. 编辑整个贴纸 / 笔记：整篇 Markdown 进入 `textarea`。

目标体验要改为：

> 一篇笔记由多个 block 组成；任何时刻最多只有一个 block 处于编辑态，其他 block 都保持渲染态。

这与 2026-06-29 已落地的 Todo 块能力一致：文本仍是 Markdown，渲染器可以把标准 Markdown task list 呈现成更好的块 UI。

## Task

本方案要回答：

1. block 应该怎么定义。
2. 如何保证“最多只有一个 block 在编辑态”。
3. 如何保留 Markdown-first，不引入私有 JSON 内容模型。
4. 如何避免重蹈旧版 `contenteditable BlockEditor` 的光标和复杂度问题。
5. 如何分阶段落地，不一次性重写整个编辑器。

## 当前项目状态

当前项目已经具备 Markdown-first 的单活跃块编辑首版，但还不是完整 block editor。

现状更准确地说是：

> Markdown text source of truth + derived block facade + single active block textarea editor。

### 已经具备的能力

| 能力 | 当前位置 | 说明 |
|---|---|---|
| Markdown source 编辑 | `src/lib/components/note/BlockNoteContent.svelte` | 编辑态是当前 block 的 Markdown slice textarea |
| Markdown 渲染 | `src/lib/markdown/renderer.js` | 自研 line scanner，把 Markdown 转成 HTML |
| block facade | `src/lib/markdown/blocks/*` | 从 Markdown 派生 block list，并按 range 回写 |
| Todo 行解析与回写 | `src/lib/markdown/task-list.js` | 基于行号 toggle / append |
| 工作台详情 | `src/lib/components/workspace/WorkspaceNoteInspector.svelte` | 复用 `BlockNoteContent` |
| 便笺详情页 | `src/routes/note/[id]/+page.svelte` | 复用 `BlockNoteContent`，额外处理拖拽 / 置顶 / 穿透 |

### 还没有的能力

| 缺口 | 影响 |
|---|---|
| 没有持久化 block id | 第一阶段 block id 仍是派生值，外部同步修改时需要 range 校验 |
| 块内 `/` 命令建议已恢复 | active block textarea 现在可做命令联想与插入 |
| 图片粘贴未迁移到 active block | 旧整篇 `SourceEditorPane` 路径支持图片粘贴，块编辑路径待补齐 |

2026-06-29 Phase 1 已经补齐：

| 能力 | 当前位置 | 说明 |
|---|---|---|
| `parseMarkdownBlocks(text)` | `src/lib/markdown/blocks/block-parser.js` | 从 Markdown 派生单层 block list |
| `renderMarkdownBlocks(blocks)` | `src/lib/markdown/blocks/block-renderer.js` | 保持 `renderNoteMarkdown` 对外 HTML 行为 |
| block range ops | `src/lib/markdown/blocks/block-ops.js` | 提供 `replaceBlockMarkdown` / `blockRangeMatches` |
| 笔记渲染编排 | `src/lib/markdown/note-renderer.js` | `expandNoteCommands -> parseMarkdownBlocks -> renderMarkdownBlocks` |
| 工作台/便笺单块编辑 | `src/lib/components/note/BlockNoteContent.svelte` | 最多只有一个 block textarea |

因此当前实现已经有派生 block facade，且工作台 inspector 与便笺窗口均已接入单块编辑 UI。

## 调研结论

### ProseMirror

ProseMirror 的核心启发是“文档结构由 schema 约束，顶层文档包含 block，段落里再包含 inline”。官方 guide 描述了 ProseMirror document 是层级 node 结构，典型 document 包含 block nodes；它也明确区分 block / inline / textblock / leaf block。

参考：<https://prosemirror.net/docs/guide/>

对本项目的启发：

- block 应该成为显式结构，而不是 renderer 中临时拼出的 HTML。
- 但 ProseMirror 是完整富文本编辑器，迁入成本高，而且会把内容真相从 Markdown 文本推向 editor document model。
- 如果未来要做复杂 selection、协同编辑、嵌套块拖拽，可以重新评估 ProseMirror；当前阶段不引入。

### Lexical

Lexical 的核心启发是 `EditorState = node tree + selection`。官方文档把 editor state 描述为包含 node tree 和 selection，nodes 既组成视觉编辑视图，也代表底层数据模型。

参考：

- <https://lexical.dev/docs/concepts/editor-state>
- <https://lexical.dev/docs/concepts/nodes>

对本项目的启发：

- “最多一个 block 编辑态”本质上就是 selection / active node 管理问题。
- 但 Lexical 也会要求以自己的 node tree 作为编辑状态中心，不适合当前第一阶段直接替换。
- Lexical 默认围绕 `contenteditable` 工作，与项目刚从旧 `BlockEditor` 回退的历史风险冲突。

### Slate

Slate 的核心启发是文档是一棵 node tree：root-level Editor 包含整个文档，Element nodes 表示领域语义，Text nodes 表示叶子文本。

参考：<https://docs.slatejs.org/concepts/02-nodes>

对本项目的启发：

- `paragraph`、`heading`、`task_block` 都应该是同一层 block / element。
- 可以借鉴 tree 思路，但当前项目先做单层 block list，不做嵌套树。
- Slate 的自由度高，但也意味着 normalization、selection、Markdown serialization 都要自己维护；短期收益不如轻量 facade。

### CodeMirror 6

CodeMirror 6 的核心启发是“文本变更是 transaction / changes”。官方 guide 把 editor state 描述为不可变数据值，并说明 document changes 描述旧文档中哪些 ranges 被新文本替换。

参考：<https://codemirror.net/docs/guide/>

对本项目的启发：

- 本项目继续以 Markdown 文本为唯一真相时，block 编辑应落成“对原文某个 range 做 replace”的操作。
- 这比把 DOM 作为真相更稳定，也能避免旧 `contenteditable` 路线的 caret 问题。
- 如果后续发现 textarea 对单块源码体验不足，可在 active block 内局部接 CodeMirror，而不是把整篇 note 切到 CodeMirror。

### 选型结论

| 方案 | 优点 | 成本 / 风险 | 当前结论 |
|---|---|---|---|
| 继续整篇 `textarea` | 稳定、简单 | 达不到单块编辑目标 | 作为 fallback 保留 |
| 恢复旧 `contenteditable BlockEditor` | 看起来接近块编辑 | 历史上已出现 caret 跳动和状态双轨复杂度 | 不采用 |
| ProseMirror / Lexical / Slate | 完整编辑器能力、成熟 selection 模型 | 内容模型迁移、Markdown 序列化、包体和学习成本 | 暂不引入 |
| CodeMirror 整篇编辑 | 文本编辑能力强 | 仍是整篇编辑，不解决渲染块混排 | 暂不作为主方案 |
| Markdown text + derived block facade | 保留 Markdown 真相，可小步迁移 | 需要自研 block parser 与 range ops | 当前推荐 |

## 方案决策

### 总方向

不恢复旧版 `contenteditable BlockEditor`。

采用：

> Markdown text source of truth + derived block facade + single active block textarea editor.

也就是：

1. `note.text` 仍是唯一持久化内容。
2. 前端从 `note.text` 解析出 block list。
3. 非 active block 渲染为 HTML / 交互组件。
4. active block 渲染为小型 `textarea` 或专门块编辑控件。
5. commit 时只替换该 block 对应的 Markdown 行范围。

### 为什么不用 contenteditable

历史文档已经记录旧路线退役原因：

- `docs/ui/2026-02-09-note-block-editor-mvp.md`
- `docs/ui/2026-02-17-workspace-note-single-block-editing.md`
- `docs/ui/2026-03-27-note-editor-single-document-reset.md`

核心问题是：

1. `contenteditable` 光标恢复复杂。
2. 每次输入后 DOM / state 回写容易造成 caret 跳动。
3. 块编辑与源码编辑双轨维护成本高。
4. 当时产品边界未收敛，导致实现过重。

新方案只编辑当前 block 的 Markdown source slice，不把 DOM 作为内容真相。

## Block 模型

第一阶段使用单层 block list。

```js
{
  id: "task_block:5:7:hash",
  type: "task_block",
  startLine: 5,
  endLine: 7,
  rawLines: ["- [ ] A", "- [x] B", "- [ ] C"],
  markdown: "- [ ] A\n- [x] B\n- [ ] C",
  editable: true
}
```

### 字段语义

| 字段 | 说明 |
|---|---|
| `id` | 派生 id，不写入 Markdown；建议由 `type + startLine + endLine + hash(markdown)` 生成 |
| `type` | block 类型，用于选择渲染和编辑控件 |
| `startLine` | block 在 `note.text` 中的起始行号，0-based，包含 |
| `endLine` | block 在 `note.text` 中的结束行号，0-based，包含 |
| `rawLines` | 原始 Markdown 行，不做 trim |
| `markdown` | `rawLines.join("\n")`，active block 的编辑文本 |
| `editable` | 当前阶段是否允许进入编辑态 |

第一阶段不持久化 block id。原因：

1. 不污染 Markdown。
2. 不引入私有语法。
3. 现有 note 导入 / 导出 / 复制仍是标准 Markdown。

代价是：外部并发修改时 range 可能漂移，因此 commit 前必须校验 original range。

### Block 类型

第一阶段建议支持：

| type | Markdown 来源 | 编辑方式 |
|---|---|---|
| `paragraph` | 连续普通文本行 | textarea |
| `heading` | `#` 到 `######` 单行 | textarea |
| `task_block` | 连续 `- [ ]` / `- [x]` 行 | Todo block 编辑 / textarea fallback |
| `bullet_list` | 连续 `- ` / `* ` 行 | textarea |
| `ordered_list` | 连续 `1. ` 行 | textarea |
| `blockquote` | 连续 `> ` 行 | textarea |
| `code_block` | fenced code block | textarea，保留 fence |
| `table` | header + separator + rows | textarea |
| `image` | 单行 image markdown | textarea |
| `hr` | `---` / `***` / `___` | type switch / readonly first |

### Block 边界

规则：

1. 空行是 paragraph 的自然分隔。
2. 标题、图片、分割线是单行 block。
3. fenced code 从开 fence 到 close fence 是一个 block。
4. table 从 header + separator 开始，直到非 table 行结束。
5. task list 是连续 task 行，形成一个 `task_block`。
6. 普通 list 是连续 list 行，形成一个 list block。

### 当前边界细节

1. 普通文本按“一行一个 `paragraph` block”处理。原因是当前交互目标已经改成普通 `Enter` 立刻产生下一块，旧块渲染、新块编辑。
2. 渲染态 `parseMarkdownBlocks(text)` 继续跳过空行，保持 Markdown 阅读语义；编辑态 `BlockNoteContent` 使用 `parseMarkdownBlocks(text, { preserveBlankBlocks: true })`，把空行作为可激活的空 paragraph 占位。
3. 嵌套 list 第一阶段先并入所属 list block，不拆子 block。
4. code fence 内部不再解析 Markdown，也不识别 task line。
5. table 只识别当前 renderer 已支持的 pipe table，不先追求完整 GFM table。
6. `@todo` / `@done` 在输入阶段仍可被展开为标准 task list；block parser 主要面向保存后的 Markdown。

### Parser 与 Renderer 的关系

推荐重构方向：

```text
note.text
  -> parseMarkdownBlocks(text)
  -> renderMarkdownBlocks(blocks, options)
  -> NotePreview / BlockNoteContent
```

第一阶段可以让 `renderNoteMarkdown(text)` 保持公共 API 不变，内部改为：

```js
export function renderNoteMarkdown(text, options = {}) {
  return renderMarkdownBlocks(parseMarkdownBlocks(text), options);
}
```

这样可以先拿到 block list，而不要求调用方一次性迁移。

## 单活跃编辑状态

组件层只允许一个 active block：

```js
{
  activeBlockId: string | null,
  activeBlockRange: { startLine: number, endLine: number } | null,
  activeBlockDraft: string,
  activeBlockOriginal: string
}
```

规则：

1. `activeBlockId === null`：整篇笔记处于阅读态。
2. 点击某个 block：如果已有 active block，先 commit 或 cancel，再切换。
3. active block 使用编辑控件。
4. 其他 block 始终使用渲染态。
5. 任意时刻不得出现两个编辑控件。

推荐默认行为：

- 点击其他 block：先 commit 当前 draft，再打开新 block。
- `Enter`：提交 / 拆分当前 block，并让下一个 block 成为唯一编辑态。
- `Shift + Enter`：在当前 block 内换行。
- `Backspace`：光标位于当前 block 开头时回到上一块；空 block 会被删除，非空 block 会合并到上一块后面。
- `Esc`：取消当前 block draft。
- `Ctrl/Cmd + Enter`：commit 当前 block draft。
- blur：commit 当前 block draft。

### 状态机

```text
idle
  click editable block -> editing(blockId)

editing(blockId)
  input -> editing(blockId, dirty)
  Enter -> split current block -> editing(nextBlockId)
  Backspace at block start -> merge/delete current block -> editing(previousBlockId)
  Ctrl/Cmd+Enter -> commit -> idle
  Esc -> cancel -> idle
  click another block -> commit current -> editing(nextBlockId)
  external text change with same range -> keep editing
  external text change with range mismatch -> conflict -> idle
```

页面层不能再只有 `mode=view/edit` 两态。推荐拆成：

| 状态 | 归属 | 说明 |
|---|---|---|
| `noteMode` | 页面 / 容器 | 仍可表示是否允许编辑，例如 readonly / editable |
| `activeBlockId` | `BlockNoteContent` | 当前唯一编辑块 |
| `activeBlockDraft` | `BlockNoteContent` | 当前块源码草稿 |

也就是说：整篇 note 进入“可编辑容器”后，并不代表所有 block 都是编辑态。

## 文本回写

核心操作是 range replace：

```js
replaceBlockMarkdown(noteText, block, nextMarkdown)
```

等价于：

1. `note.text` split lines。
2. 用 `block.startLine` / `block.endLine` 替换对应行。
3. join 回 Markdown。
4. 走现有 `update_note_text` 持久化。

### 并发与漂移

第一阶段不加稳定 block id 到 Markdown，避免污染文本。

风险：

- 用户编辑 block 时，外部窗口同步改了同一篇 note，`startLine/endLine` 可能漂移。

缓解：

1. active block 记录 `activeBlockOriginal`。
2. commit 前确认当前 range 内容仍等于 original。
3. 如果不一致，放弃自动覆盖，提示用户重新进入编辑。

### Undo / Cancel 边界

第一阶段只保证 block 级取消：

- `Esc` 恢复当前 active block 到进入编辑时的 `activeBlockOriginal`。
- 不做跨 block undo history。
- 不接管系统级整篇 undo。

如果后续需要完整 undo history，可以在 `block-ops.js` 增加操作栈，或只在 active block 内接入 CodeMirror。

## UI 设计

### 阅读态

所有 block 渲染：

```text
[paragraph rendered]
[task block rendered]
[heading rendered]
```

hover block 时显示轻量操作：

- `+`：在下方插入新 paragraph block。
- block type icon / menu：后续再做。

### 单块编辑态

只有当前 block 显示编辑器：

```text
[paragraph rendered]
[textarea editing task_block]
[heading rendered]
```

设计要求：

1. 编辑器尺寸贴合当前 block，不展开成整篇笔记。
2. 非编辑 block 可读、可滚动。
3. 当前 block 有明显 focus ring。
4. 小贴纸窗口中控件必须紧凑，避免遮挡内容。

### Todo block 特例

Todo block 可以保持“渲染态可交互”：

- 勾选 checkbox 不需要进入 block 编辑态。
- 点 `+` 追加 task 行不需要进入 block 编辑态。
- 点击任务文本或块空白处才进入该 Todo block 编辑态。

这与当前已落地 Todo 交互保持一致。

## 模块拆分建议

新增：

```text
src/lib/markdown/blocks/block-parser.js
src/lib/markdown/blocks/block-renderer.js
src/lib/markdown/blocks/block-ops.js
src/lib/components/note/BlockNoteContent.svelte
src/lib/components/note/MarkdownBlockView.svelte
src/lib/components/note/MarkdownBlockEditor.svelte
src/lib/components/note/TodoBlockView.svelte
```

职责：

| 文件 | 职责 |
|---|---|
| `block-parser.js` | Markdown text -> block list |
| `block-renderer.js` | block -> HTML / render payload |
| `block-ops.js` | replace / insert / delete / split / merge block |
| `BlockNoteContent.svelte` | 管理 active block，协调 view/editor |
| `MarkdownBlockView.svelte` | 普通 block 渲染 |
| `MarkdownBlockEditor.svelte` | 当前 block 的 textarea 编辑 |
| `TodoBlockView.svelte` | Todo block 的 checkbox / add 行 |

页面层不直接处理 block 操作，只传入：

```js
text
onTextChange(nextText)
interactive
compact
```

### 与现有文件的迁移关系

| 现有文件 | 迁移方式 |
|---|---|
| `src/lib/markdown/renderer.js` | 保留 `renderNoteMarkdown` API，内部逐步切到 block parser |
| `src/lib/markdown/task-list.js` | 继续负责 task line 解析、toggle、append；后续被 `TodoBlockView` / `block-ops` 调用 |
| `src/lib/components/note/NotePreview.svelte` | 可先作为纯 HTML preview 保留；单块编辑阶段由 `BlockNoteContent` 接管 block 点击 |
| `src/lib/components/note/SourceEditorPane.svelte` | 保留为整篇源码 fallback 和 block textarea 的样式/行为参考 |
| `src/lib/components/workspace/WorkspaceNoteInspector.svelte` | Phase 2 先从整篇 `mode=edit` 改为 `BlockNoteContent` |
| `src/routes/note/[id]/+page.svelte` | 已接入同一个 `BlockNoteContent`，额外处理拖拽与桌面层交互 |

## 落地阶段

### Phase 1：Block parser + 渲染等价

状态：已完成（2026-06-29）

目标：

- 新增 `parseMarkdownBlocks(text)`。
- `renderNoteMarkdown(text)` 内部先 parse blocks，再 render blocks。
- UI 不变。

验收：

- 现有 Markdown 渲染输出尽量保持一致。
- Todo block 仍可勾选和追加。
- `make check` / `make build` 通过。

当前实现说明：

- `renderNoteMarkdown(text, options)` 公共 API 保持不变。
- Todo checkbox / append 的 `data-task-line` 继续使用整篇 Markdown 的绝对行号。
- `hr` 第一阶段标记为 `editable: false`。
- block id 仍是 `type:startLine:endLine:hash(markdown)` 派生值，不写入 Markdown。

### Phase 2：工作台 inspector 单活跃块编辑

状态：首版已完成（2026-06-29）

先在工作台 inspector 落地，原因：

- 不涉及贴纸窗口拖拽、置顶、穿透策略。
- 区域更宽，回归成本更低。

验收：

- 单击 block，仅该 block 进入编辑态。
- 其他 block 保持渲染态。
- `Esc` 取消，`Ctrl/Cmd + Enter` 保存。
- 点击另一 block 时最多只有一个编辑器。

当前实现说明：

- 工作台 inspector 的正文改为 `BlockNoteContent`。
- 2026-06-29 修正：工作台不再保留整篇编辑 / 保存按钮，正文始终是块渲染，单击某块进入该块的 Markdown slice textarea。
- blur 或 `Ctrl/Cmd + Enter` 通过 `replaceBlockMarkdown` 回写整篇 note。
- 2026-06-29 修正：普通 `Enter` 会提交当前块并在下方创建新 paragraph block，新块保持编辑态；`Shift+Enter` 才保留为块内换行。普通 paragraph / heading 按光标位置拆成“当前块 + 下一块”；Todo/list/code/table 等结构块先保持当前块完整，再在块后插入空 paragraph，避免破坏 Markdown 结构。
- 2026-06-29 修正：`Backspace` 在 active block 开头会回到上一块。当前块为空时删除空块并把上一块打开到末尾；当前块非空时把当前 Markdown slice 接到上一块后面，caret 停在合并边界。合并前必须同时校验当前块和上一块 range，避免外部同步后误覆盖。
- 2026-06-29 修正：`BlockNoteContent` 的编辑态回到朴素单状态：`activeBlockId + activeBlockOriginal + activeBlockDraft`。模板只允许 `activeBlockId` 对应的一个 block 渲染 textarea，其他 block 始终渲染为 HTML。
- `Esc` 取消当前 block draft。
- Todo checkbox 仍可在渲染态交互，不强制进入编辑态；渲染态不显示追加 `+`。
- 2026-06-29 修正：active block 必须是正文内联 Markdown 源码编辑，不允许做成独立滚动 / 可拖拽 resize 的小容器；滚动只保留在整篇 inspector 内容区。
- 2026-06-29 修正：对于工具栏生成的安全 inline color `span`，active block textarea 使用 `纯文本 draft + inline color ranges`，编辑态隐藏 `<span>` 标签，commit 时再序列化回 Markdown；其他 Markdown 语法仍按源码文本显示。
- 2026-06-29 修正：块外不再保留可见容器边框或卡片感，block 是正文的一部分，不是单独面板。
- 2026-06-29 修正：active block textarea 不再保留额外左侧 padding，避免编辑态文本被误看成 Markdown 缩进；需要表达缩进时只能来自真实 Markdown 文本。
- 2026-06-29 修正：active block textarea 必须继承正文 `font`，不能使用单独等宽字体或缩小字号，否则编辑态会比渲染态显著更细、更小。
- 2026-06-29 修正：active block textarea 的 `rows` 必须贴近真实 Markdown 行数，单行 block 不能强制撑成两行，否则编辑态会凭空挤出下方空白。
- 2026-07-01 修正：active block textarea 恢复 `/` 命令建议，并继续复用 `@todo` / `@done` / `/todo` 命令目录；图片粘贴仍保留为后续局部能力。
- 2026-07-01 修正：便笺底部工具栏不再保留编辑 / 保存双态按钮；进入编辑由点击正文 block 负责，保存由 block blur 或 `Ctrl/Cmd + Enter` 负责。

### Phase 3：便笺窗口接入单活跃块编辑

状态：首版已完成（2026-06-29）

接入同一个 `BlockNoteContent.svelte`，不再走整篇 `SourceEditorPane` / `NotePreview` 分支。

当前实现说明：

- 便笺正文外层保留原有阅读边距和整篇滚动，block 本身不显示额外容器边框。
- 单击可编辑 block 时进入该 block 的 Markdown slice textarea，并通知便笺容器进入编辑 / 操作态。
- 拖动窗口仍由外层 `note-window-drag` 管理；拖拽完成后的短暂 click 抑制会阻止误打开 block 编辑态。
- 桌面层 / 鼠标穿透导致 `canInteract=false` 时，`BlockNoteContent` 以 readonly 方式渲染，不能进入编辑态。
- Todo checkbox 仍走行级 Markdown 回写，不触发块编辑；追加入口收敛到编辑态。

额外关注：

- 点击 checkbox 不触发窗口拖拽，也不进入 block 编辑。
- 点击 block 文本进入编辑态。
- 桌面层 / 鼠标穿透状态下不可编辑。
- 小窗口内 active block 编辑器不能撑破布局。
- 块内 `/` 命令建议已恢复，图片粘贴仍需要做成 active block textarea 的局部能力。

### Phase 4：块操作增强

后续再做：

- 2026-06-29 已完成：active block 右下角 `+` 插入同类型空白内容；Todo/list/quote 在当前结构块内追加空行，paragraph/heading/code/table/image 在当前块后插入同类空块；全程不复制已有文本。
- 2026-07-01 修正：Todo 渲染态隐藏追加 `+`，避免非编辑状态出现脱离上下文的创建按钮；Todo 新增通过 active block 编辑态或 `/todo` 命令完成。
- 2026-06-29 已完成：active block 开头 `Backspace` 合并 / 删除当前块并回到上一块，解决删空后无法继续退回上一行的问题。
- `/` 命令切换当前空 block 类型。
- 结构块内部更细粒度拆分，例如 Todo 单行拆分、list item 拆分。
- block 拖拽排序。
- Todo block 内任务拖拽排序。

## 与当前 Todo 实现的关系

当前 Todo 实现是：

> 块级 UI + 行级 Markdown 回写。

本方案下一步是：

> 块级 parser + 单活跃块 editor + range-based Markdown 回写。

两者不冲突。当前 `src/lib/markdown/task-list.js` 可以继续作为 `task_block` 的行级操作工具，后续由 `block-ops.js` 调用。

## 风险与取舍

### 风险 1：重新引入编辑器复杂度

控制方式：

- 不使用 contenteditable。
- 第一阶段每个 active block 用 textarea 编辑 raw Markdown slice。
- 不做 inline rich text selection。

### 风险 2：Markdown block 边界与用户预期不一致

控制方式：

- 先支持当前 renderer 已支持的语法。
- 为 block parser 增加 fixture。
- 不急着支持嵌套 block。

### 风险 3：保存链路变复杂

控制方式：

- `note.text` 仍是唯一真相。
- block draft 只是临时 UI 状态。
- commit 后仍走 `update_note_text`。

### 风险 4：便笺窗口交互冲突

控制方式：

- Phase 2 先在工作台 inspector 验证。
- 便笺接入时复用现有 `CONTROL_MODE_TRIGGER_BLOCKED_SELECTOR` 思路，把 block editor、checkbox、button 纳入拖拽屏蔽区。

## 当前建议结论

建议推进，但不要一次性恢复旧 BlockEditor。

推荐路线：

1. 先做 Markdown block parser。
2. 保持渲染等价。
3. 在工作台 inspector 做单活跃块编辑。
4. 再迁入便笺窗口。

这样可以满足“最多只有一个块编辑态”的产品目标，同时保留 Markdown-first、避免 contenteditable 光标坑，并让当前 Todo 块能力自然演进。
