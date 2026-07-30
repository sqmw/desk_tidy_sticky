# Project TODO

状态：活跃主 TODO

维护原则：只记录当前主线、阶段状态、阻塞与专题索引；详细方案放入对应专题文档。

## Active

### UI Design System Overhaul

状态：Phase 0 done（2026-07-26）；workstation 视觉重设计第一轮 done（2026-07-26）；Phase 1 全量 token 迁移未开始

优先级：high

目标：解决整体 UI 视觉粗糙与设计不一致问题。建立 root 级 design token 体系（颜色/间距/圆角/阴影/字号/动效/焦点环），合并三套分裂的 token（`--ws-*` / `--primary` / `--note-*`），让 mini 面板与贴纸窗口获得主题与暗色能力，收敛按钮/卡片/开关/图标为统一基础组件，补齐焦点可见性与 ARIA。

关联文档：

- `docs/ui/2026-07-26-ui-design-audit.md`（全量审计 + Phase 0-4 路线 + 量化验收基线）
- `docs/ui/2026-07-26-workspace-visual-redesign.md`（workstation 视觉重设计第一轮：设计语言、结构 token、分区改动与遗留项）

已完成（2026-07-26，Phase 0 止血）：

1. mini 设置/编辑弹窗不再溢出 360×500 窗口（backdrop 加 padding、宽度 `min()`、内容区 flex 滚动）。
2. 贴纸工具栏遮罩高度改为随工具栏实际行数（`bind:clientHeight`），四个 popover（颜色/字色/透明度/毛玻璃）统一锚定在工具栏上方居中，去掉 `right:84px/46px`、`bottom:42px/72px` magic number。
3. 主列表补空态（首启/搜索无果/归档/回收站，文案入 strings.js en+zh）；贴纸窗口 `Loading...` 样式化并本地化为 `noteLoading`；🎨 按钮 title 本地化为 `changeColor`。
4. 面板 Esc 冲突修复：弹窗打开时 Esc 先关弹窗，不再直接隐藏窗口。
5. 删死代码：NotePreview / SourceEditorPane / CreateTagSelect / NotesQuadrantBoard 四个未引用组件（含 NotesSection 不可达 quadrant 分支）、FocusPlanner 重复的 1220px 媒体块、workspace 与 WorkspaceSettingsDialog 两份被内联 style 覆盖的死 `theme-dark` token 块（已注明单一真源为 theme-presets.js）。

验证：2026-07-26 全量 `svelte-check --tsconfig ./jsconfig.json` 通过（0 errors / 0 warnings）；strings.js en/zh 键位零缺失；`node --test` 3 个前端测试通过；`git diff --check` 通过。本轮 src-tauri 零改动，无需 `cargo check`。发布前仍建议人工回归：mini 设置弹窗、贴纸工具栏 hover 与 popover、空列表四种空态、Esc 行为。

已完成（2026-07-26，workstation 视觉重设计第一轮）：

统一 workstation 窗口视觉语言：结构 token（radius/shadow/focus-ring + 各预设 `--ws-shadow-color`）、light/dark 预设调色、图标化侧栏导航与统一激活态、switch 形态底部开关（后续修正：窄宽度保留文字省略截断 + `min-width:0` 防开关裁切）、composer 式创建栏与实心主按钮、内嵌图标搜索框、笔记卡片重排版（底部 meta 行 + 悬浮操作条 + 列表空态）。详情区经用户确认由分栏改为 side-peek 浮层抽屉（网格零重排 + 出入场动效，复用原拖宽/全宽折叠状态机）。范围与遗留见 `docs/ui/2026-07-26-workspace-visual-redesign.md`。贴纸窗口与 mini 面板本轮未动。

已完成（2026-07-26，回顾页重设计）：

回顾页（已办/日历）按新设计语言重做：KPI 瓦片、分段式 tab、一行式筛选（根治暗色白条，audit H2 的 ReviewHub/ReviewFilters/ReviewCalendar 部分）、已办时间线（轨道节点 + 悬停操作）、日历热力格改 accent 混 `--ws-card-bg`。已用 fixture 在亮/暗双主题目检已办与日历两个 tab。统计 tab 复用的 `WorkspaceFocusStats` 留待 Focus hub 收敛轮。

已完成（2026-07-26，专注页重设计）：

专注页按新设计语言重做：计时器大字居中 + 分段 tab + accent 进度条、规划器表单统一与实心添加按钮、任务行两行制（悬停显编辑/删除、进行中 accent 染色 + 进度填充）、底部回顾摘要压成单行、侧栏今日任务超时降噪（左红条 + 红徽章替代整卡红底）、全部 🍅 emoji 换线性 SVG。fixture 亮/暗双主题目检通过。`WorkspaceBreakControlBar`（休息控制 tab 内部）与 `WorkspaceFocusStats` 未动，留下一轮。

当前下一步：

1. 真实 Tauri 运行下人工回归：带数据卡片网格、四象限视图、抽屉打开/切换/拖宽/全宽折叠、回顾页三个 tab 与筛选/补记流程、专注页计时/开始暂停/编辑任务/超时延后、五套主题预设。
2. Phase 1 token 层：`base.css` 建 `:root` token 并三窗口共用注入；批量清理 1,328 处颜色字面量与 `color-mix(..., #ffffff)` 暗色崩坏问题；默认主题模板去 `!important`。
3. Phase 2 起把四象限板与 Focus / Review hub 收敛到本轮卡片/按钮语言；后续 Phase 3-4（a11y 与动效、巨型文件拆分）见审计文档。

风险：

- token 批量替换涉及 60+ 组件，需分批提交并逐窗口回归（mini / 贴纸 / workstation / break-overlay）。
- 与进行中的 Workstation UI Cleanup 有范围重叠，Phase 2 收敛按钮/卡片时需先对齐该专题已确认的方向。

### Sticky Window & Block Editor Overhaul

状态：第一轮 done（2026-07-29）；S1 共享 token、S4 渲染清债与 S6 高级编辑能力待后续阶段

优先级:high

目标:按 `docs/ui/2026-07-27-sticky-window-audit.md` 的 40+ 条带行号发现,分期整改贴纸窗口视觉层(token 注入共享/暗色/工具栏/popover)与块编辑器(hover 态/光标映射/编辑态排版对齐/块间距/冲突提示/图片粘贴断链/渲染质量),并清理 ~250 行死代码与两个巨型文件。分期方案 S1-S6 见审计文档末节;S6(块类型菜单/跨块选择/拖拽排序/巨文件拆分)需单独立项讨论。

关联文档:

- `docs/ui/2026-07-27-sticky-window-audit.md`(全量核查报告 + S1-S6 分期方案)

本轮范围（2026-07-29）：

1. 保留原产品策略：进入控制 / 编辑态时，退出与标签控件向上扩窗、工具栏向下扩窗，正文区域尺寸和屏幕坐标不变；工具操作全部直达，不使用“更多”菜单。
2. 工具栏保留新的紧凑视觉，在宽窗口单行展示；窄窗口自然向下换行，并按实际高度扩窗。顶部标签区同样按实际高度向上扩展。
3. 移除覆盖正文的顶部拖拽柄、活动块整框、额外块间距和列表二次缩进；恢复正文表面的原有拖动命中，非活动内容不因进入编辑态发生位置变化。
4. 收敛浏览 / 控制 / 活动块编辑状态，保留外部更新草稿保护、退出前提交和图片粘贴。
5. 保持 Markdown-first 单活动块架构；跨块选择、块拖拽排序及模型驱动编辑器仍归入后续 S6。

验收门禁：`make check`、前端测试、`git diff --check`，并在可运行的 Tauri 环境人工回归向下扩窗、中文输入、文本复制、Esc 分层与外部更新冲突提示。

纠偏证据：组件预览测得 ordered-list 编辑前后 `top/left` 相同，高度仅有 `0.09px` 浏览器舍入差；h1 编辑后后续内容位移为 `0.20px` 舍入差。第二轮修复移除了误伤整块正文的拖动拦截，并用可测试窗口框架保持贴纸矩形坐标：760px 宽时顶部/底部分别外扩 57px/66px，288px 宽时分别外扩 90px/102px，10 个底部按钮全部可见。真实 Tauri 窗口仍需人工回归原生双向扩窗、中文输入法、窗口拖动、图片粘贴与外部冲突流程。

### Sticky Edge Auto Hide

状态：in_progress

优先级：medium

目标：实现已钉在桌面且置顶显示的贴纸隐藏能力：拖动溢出屏幕边界时可溢边隐藏，快捷键可隐藏最近编辑过的顶层贴纸；存在隐藏贴纸时，快捷键优先恢复显示。

关联文档：

- `docs/ui/2026-07-04-sticky-edge-auto-hide-plan.md`

当前下一步：

1. 已实现 Note 持久化字段、Rust 统一隐藏 / 显示命令、`activeTopmostEditingNoteId` tracker、`Ctrl+Shift+H` 全局快捷键、贴纸工具栏“溢边隐藏”开关和拖动溢边触发。
2. 验证已通过：`cargo test --manifest-path src-tauri/Cargo.toml sticky::auto_hide`、`make check`、`make build`。真实运行验证使用临时 `HOME` 启动开发版 Tauri，并设置 `DESK_TIDY_STICKY_RUNTIME_CHECK=sticky_auto_hide`；日志已出现 `hide active note`、`reveal hidden note`、`hide overflowed note`、`reveal overflow hidden note` 和 `sticky_auto_hide PASS`。
3. 后续候选入口：面板 / workstation 卡片上的“显示隐藏贴纸”按钮和托盘入口，先不阻塞当前两种隐藏触发模式验收。

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
3. 已补充：右侧详情展开时，普通网格和四象限笔记卡片单击即可切换详情；详情未展开时仍保持双击打开。
4. 若确认无误，再进入后续发布/打包或继续处理新的 UI 反馈。

### Single Active Block Editor

状态：in_progress

优先级：high

目标：把当前“整篇笔记编辑 / 整篇笔记预览”改为“最多一个 Markdown block 处于编辑态，其他 block 保持渲染态”。

关联文档：

- `docs/architecture/2026-06-29-single-active-block-editor.md`
- `docs/product/2026-06-29-note-todo-blocks.md`
- `docs/issues/2026-07-04-list-continuation-rendering-regression.md`
- `docs/issues/2026-07-04-list-enter-continuation.md`
- `docs/issues/2026-07-04-list-boundary-and-scroll-regression.md`
- `docs/issues/2026-07-05-blockquote-rendering-style-regression.md`
- `docs/issues/2026-07-05-heading-enter-and-boundary-caret-navigation.md`

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
3. 回归 active block 列表 / heading `Enter` continuation、Markdown 块级边界、blockquote 视觉、边界方向键导航、滚动位置保持和右下角 `+` 追加入口。

风险：

- 第一阶段 block id 不持久化，外部同步修改时需要通过 original range 校验避免覆盖。
- 不恢复旧 `contenteditable BlockEditor`，避免历史 caret 跳动问题回归。

## Done

### 2026-07-15：Notes storage safety and architecture governance

结果：笔记存储改为应用级串行 `NotesStore`；读取损坏的 `notes.json` 时进入 `recovery_required` 并阻止写入，不再以空数组覆盖。写入采用同目录临时文件同步、原子替换和最近一次有效备份，失效笔记 ID 返回明确错误。工作台卡片保留详情展开时的鼠标单击切换，新增独立键盘详情入口；工作台笔记装配和块编辑瞬态状态已拆分为专用组件/控制器。

验证：2026-07-15 已通过 `make check`、`make test`（10 个 Rust 单测与 3 个前端交互测试）和 `git diff --check`。发布前仍需在目标操作系统人工回归恢复提示、卡片单击和贴纸编辑流程。

关联文档：`architecture/2026-07-15-notes-storage-safety-and-governance.md`、`agent-context/current.md`。

接受风险：不对损坏数据执行自动修复；运行时备份保留在系统应用数据目录。当前环境无法完成 Windows 目标编译，见 `agent-context/current.md`。

### 2026-07-04：Fix Markdown list continuation rendering

结果：修复单活跃块 parser / renderer 对 list continuation 的归属问题。`1. ...` 后紧跟的 `a. ...` 会作为同一个 ordered list item 的续行渲染，保留字面 `a.`，不再拆成独立 paragraph；`## ...` 等新的 Markdown 块级起始行会正确切断当前 list，避免标题被吞掉且后续 ordered list 序号串到上一组；ordered list 的 `+` 追加路径仍会生成下一条数字序号。编辑态补充接管 `Tab` / `Shift+Tab`，支持当前行或选中多行缩进 / 反缩进，并保留命令补全弹出时 `Tab` 选择命令的行为；缩进期间会抑制 blur 提交，避免按 `Tab` 后退出编辑态。后续增强：普通 `Enter` 在列表行内优先续写下一 marker，空子项再次 `Enter` 会退到上一级，顶层空项再次 `Enter` 退出列表；`Shift+Enter` 强制硬换行并继承列表内容列缩进，连续触发不退级。便笺文本回写时会恢复滚动位置，避免按 `Enter` 后滚回顶部。

验证：Node smoke 断言解析结果、HTML 输出、追加 `2. ` 后的 ordered list block 形态、编辑态行缩进 / 反缩进 selection 回写、`a. -> b. -> 2.` 的 Enter continuation，以及连续 `Shift+Enter` 硬换行；`make check`；`make build`；`git diff --check`。

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
