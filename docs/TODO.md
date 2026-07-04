# Project TODO

状态：活跃主 TODO

维护原则：只记录当前主线、阶段状态、阻塞与专题索引；详细方案放入对应专题文档。

## Active

### Workstation UI Cleanup

状态：in_progress

优先级：high

目标：按用户新确认的方向收口 workstation UI，保留左下角高频开关，弱化侧边栏框感，压缩顶部工具条，卡片操作默认隐藏。

关联文档：

- `docs/ui/2026-06-29-workstation-ui-cleanup.md`
- `docs/ui/2026-07-03-workstation-right-pane-grid-polish.md`
- `docs/issues/2026-07-03-workstation-card-sticky-actions-regression.md`

当前下一步：

1. 用户确认右侧轻量卡片边界、网格间距和顶部创建/搜索区主次是否符合预期。
2. 用户回归 workstation 普通网格 `active/todo` 视图和四象限视图，确认钉到桌面、置顶/置底、壁纸/桌面层入口已恢复。
3. 若确认无误，再进入后续发布/打包或继续处理新的 UI 反馈。

### Single Active Block Editor

状态：in_progress

优先级：high

目标：把当前“整篇笔记编辑 / 整篇笔记预览”改为“最多一个 Markdown block 处于编辑态，其他 block 保持渲染态”。

关联文档：

- `docs/architecture/2026-06-29-single-active-block-editor.md`
- `docs/product/2026-06-29-note-todo-blocks.md`
- `docs/issues/2026-07-04-list-continuation-rendering-regression.md`

阶段：

| 阶段 | 状态 | 验收 |
|---|---|---|
| Phase 1：Block parser + 渲染等价 | done | `renderNoteMarkdown` 行为基本等价，Todo block 交互不回退 |
| Phase 2：工作台 inspector 单活跃块编辑 | done | 单击 block 仅该 block 编辑，其他 block 渲染 |
| Phase 3：便笺窗口接入 | done | 复用同一块内容组件，避免拖拽 / 置顶 / 穿透冲突 |
| Phase 4：块操作增强 | pending | 插入、拆分、合并、类型切换按需补齐 |

当前下一步：

1. 继续补齐图片粘贴能力。
2. 继续补齐空块类型退回段落。
3. 跑 `make build` 验证工作台详情和便笺详情回归。

风险：

- 第一阶段 block id 不持久化，外部同步修改时需要通过 original range 校验避免覆盖。
- 不恢复旧 `contenteditable BlockEditor`，避免历史 caret 跳动问题回归。

## Done

### 2026-07-04：Fix Markdown list continuation rendering

结果：修复单活跃块 parser / renderer 对 list continuation 的归属问题。`1. ...` 后紧跟的 `a. ...` 会作为同一个 ordered list item 的续行渲染，保留字面 `a.`，不再拆成独立 paragraph；ordered list 的 `+` 追加路径仍会生成下一条数字序号。编辑态补充接管 `Tab` / `Shift+Tab`，支持当前行或选中多行缩进 / 反缩进，并保留命令补全弹出时 `Tab` 选择命令的行为；缩进期间会抑制 blur 提交，避免按 `Tab` 后退出编辑态。

验证：Node smoke 断言解析结果、HTML 输出、追加 `2. ` 后的 ordered list block 形态，以及编辑态行缩进 / 反缩进 selection 回写；`make check`；`git diff --check`。

关联文档：`docs/issues/2026-07-04-list-continuation-rendering-regression.md`

### 2026-07-02：Resolve break reminder collision priority

结果：长休和短休在同一时刻到点时统一优先长休，前端 tick、进度展示与 Rust watchdog 的到点选择收敛到同一条规则；长休开始后短休按新的专注起点重新计时，不会在长休结束后立刻补发短休。2026-07-02 补充修正：到点判定不到点时返回空，避免跳过或自动结束后立刻重新提示休息。

验证：`node --input-type=module` 断言，`make check`，`make build`，`git diff --check`。

关联文档：`docs/ui/2026-02-17-break-control-simplification.md`

### 2026-06-29：Apply sticky text color to selected text

结果：便笺工具栏 `A` 文字色按钮不再只能修改整张贴纸默认文字色。当前 active block 有选中文字时，颜色会写入 Markdown 正文的安全 `<span style="color: ...">...</span>` 并提交当前块；没有选区时仍 fallback 到原有 `textColor` 字段，保留整体默认文字色能力。后续修正：active block 编辑态会隐藏我们生成的 color `span` 标签，只显示真实内容文本，提交时再序列化回 Markdown。

验证：`make check`，`git diff --check`。

提交：本轮提交，见 `git log`。

### 2026-06-29：Add block Backspace merge behavior

结果：修正 active block 在开头继续 Backspace 无法回到上一块的问题。当前块为空时，Backspace 会删除该空块并打开上一块到末尾；当前块非空且光标在开头时，Backspace 会把当前 Markdown slice 合并到上一块后面，并保持唯一 active block。合并前会校验当前块和上一块的原始 range，避免覆盖外部同步修改。

验证：`make check`，`git diff --check`。

提交：本轮提交，见 `git log`。

### 2026-06-29：Add active block same-type insert button

结果：active block 右下角新增悬浮 `+`，不参与正文布局；点击后不会复制当前内容，而是按当前 block 类型插入空白同类内容并让新内容进入编辑态。Todo block 追加一条空 `- [ ] ` 行，bullet / ordered / quote 追加同类空行，paragraph / heading / code / table / image 则在当前块后插入同类空块。

验证：`make check`，`git diff --check`。

提交：本轮提交；具体 hash 以 `git log` 为准。

### 2026-06-29：Prevent active block editor from adding blank space

结果：修正单行 block 进入编辑态后 textarea 被 `rows=2` 强行撑高的问题；active block 现在按真实 Markdown 行数设置最小行数，避免编辑态凭空把后续内容挤下去。

验证：`make check`，`git diff --check`。

提交：本轮提交；具体 hash 以 `git log` 为准。

### 2026-06-29：Explicit single-click block editing in workspace and sticky

结果：工作台 inspector 与便笺窗口都显式传入 `editTrigger="click"`，块编辑入口不再依赖 `BlockNoteContent` 默认值；两处都保持单击 block 进入当前块编辑态。

验证：`make check`，`git diff --check`。

提交：本轮提交；具体 hash 以 `git log` 为准。

### 2026-06-29：Match active block editor typography

结果：修正 active block 编辑态使用等宽字体和缩小字号导致的视觉回归；块 textarea 现在继承正文 `font`，编辑态和渲染态的字体族、字号、行高与重量保持一致。

验证：`make check`，`git diff --check`。

提交：本轮提交；具体 hash 以 `git log` 为准。

### 2026-06-29：Connect sticky note window to block editor

结果：便笺窗口正文接入 `BlockNoteContent`，不再用整篇 `SourceEditorPane` / `NotePreview` 分支；工作台与便笺都复用同一套 Markdown-first 单活跃块编辑。块进入编辑改为单击，拖拽后的短暂 click 抑制可阻止误打开编辑态，Todo 勾选和追加继续按 Markdown 行级回写。

验证：`make check`，`git diff --check`。

提交：本轮提交；具体 hash 以 `git log` 为准。

### 2026-06-29：Restore heading preview in note cards

结果：修正卡片预览中 `# heading` 看起来没有被识别的问题。根因有两层：工作台卡片预览通配 CSS 把 `h1` 等标题视觉压成普通正文；block parser 也未兼容 Markdown 允许的 0-3 个前导空格标题。现在卡片/列表/四象限预览保留标题粗细与字号差异，parser 与 renderer 也支持合法前导空格标题。

验证：`make check-frontend`，Node smoke 样例验证 `# title` 与前导空格标题都输出 `<h1>`。

提交：本轮提交；具体 hash 以 `git log` 为准。

### 2026-06-29：Align active block editor text edge

结果：修正 active block textarea 左侧 `6px` padding 导致的“看起来像 Markdown 首行多了两个空格”的视觉回归；编辑态文本现在与渲染态左边缘对齐，真实 Markdown 内容不被额外缩进。

验证：`make check-frontend`。

提交：本轮提交；具体 hash 以 `git log` 为准。

### 2026-06-29：Tighten single active block and Enter split

结果：把 `BlockNoteContent` 的编辑态收敛为 `activeBlockId + activeBlockOriginal + activeBlockDraft`，避免 `$state` union 推断失败和多编辑器漂移；块编辑解析开启 `preserveBlankBlocks`，渲染态继续跳过空行；普通段落和标题按光标位置拆分，结构块如 Todo/list/code/table 则先提交当前块并在块后创建空 paragraph，新块成为唯一编辑态。

验证：`make check-frontend`、`make check`、Node smoke 样例验证段落 Enter、Todo block 后插入空段落、渲染态跳过空行。

提交：本轮提交；具体 hash 以 `git log` 为准。

### 2026-06-29：Make Enter create next editable block

结果：修正块编辑中的 Enter 行为；普通 Enter 会提交当前块、创建下一个空 paragraph block，并让新块保持编辑态。`Shift+Enter` 保留为块内换行。同步修复 parser 对纯空白行的死循环风险，让空白 paragraph 可作为新块占位。

验证：`make check`，Node alias loader 样例验证插入空白块后 parser 可前进并生成新 paragraph block。

提交：`ebefe02 Make Enter create next block`。

### 2026-06-29：Remove workspace note edit/save buttons

结果：工作台 inspector 去掉整篇编辑 / 保存按钮；正文始终按块渲染，块通过单击进入编辑态。块外不再有可见容器边框，编辑区也不再呈现成一个独立小面板。

验证：`make check`。

提交：`c757e02 Remove workspace note edit buttons`。

### 2026-06-29：Fix workspace block editor inline UX

结果：修正工作台块编辑首版的反直觉体验；active block 现在以内联 Markdown 源码 textarea 呈现，自动撑高，不再有块内独立滚动条、resize 手柄或卡片式容器感；空笔记也可直接进入块编辑。

验证：`make check`。

提交：`23a0bb6 Fix workspace block editor inline UX`。

### 2026-06-29：Implement workspace single active block editing

结果：新增 `BlockNoteContent.svelte`，工作台 inspector 编辑态改为单活跃块编辑；其他块保持渲染态，Todo 勾选和追加仍可在渲染态交互。

验证：`make check-frontend`、`make check`、`make build`。

提交：`63702b7 Add workspace block editing`。

### 2026-06-29：Implement Markdown block parser foundation

结果：新增 Markdown block parser / block renderer / block range ops；`renderNoteMarkdown` 公共 API 保持不变，内部改为 `expandNoteCommands -> parseMarkdownBlocks -> renderMarkdownBlocks`。

验证：`make check-frontend`、`make check`、`make build`，Node alias loader 样例验证 block 类型、Todo 绝对行号、range replace。

提交：`e9b0248 Add markdown block parser foundation`。

### 2026-06-29：Document single active block editor design

结果：完成 Markdown-first 单活跃块编辑方案文档，明确当前项目还没有完整 block model，推荐以 derived block facade + range replace 方式推进。

验证：`git diff --check`。

提交：`35d2b06 Document single active block editor design`。
