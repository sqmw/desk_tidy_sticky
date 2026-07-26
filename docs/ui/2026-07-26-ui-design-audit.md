# 2026-07-26 UI 全量审计与整改路线

状态：audit done；Phase 0 止血 done；workstation 视觉层第一轮重设计 done（见 `2026-07-26-workspace-visual-redesign.md`）；Phase 1 全量 token 迁移未开始

范围：全部前端 UI 代码（mini 面板、贴纸窗口、workstation、break-overlay、主题系统、base.css）。方法：三路并行静态扫描 + 横向统计。

## 总体结论

代码组织成熟度远高于样式组织成熟度：JS 侧 controller/service/selector 分层清晰（150 个 js 均值 80 行），但样式侧没有设计系统——`base.css` 仅 32 行且零变量，21,908 行组件样式各自为政。整体评估 2/5：「有主题引擎，但没有设计系统」。

三个结构性根因：

1. Token 体系分裂成三套且互不打通：`--ws-*`（24 个，仅 workspace 窗口注入）、`--primary` 等 6 个（仅 mini 面板，定义在 `routes/+page.svelte:612`）、`--note-*`（仅贴纸窗口）。mini/贴纸侧引用 `var(--ws-*, #hex)` 的 757 处永远走 fallback，等于伪 token。
2. 无 spacing/radius/shadow/type/z-index token：1,328 处颜色字面量（159 个不同 hex）、42 种 box-shadow、37 种 font-size、20 种 border-radius、53% 间距值不在 4px 网格上。同一 token 在不同文件写了不同 fallback（`--ws-border-soft` 有 9 种、`--ws-text` 6 种）。
3. 暗色/主题只在亮色路径被验证：约 60 处 `color-mix(..., #ffffff)` 与 20+ 处白色 bevel 高光把亮色假设烧进组件；mini 面板与贴纸窗口完全无暗色支持；`prefers-color-scheme` / `prefers-reduced-motion` 出现次数为 0。

## 一、横向统计（证据摘要)

| 维度 | 现状 |
|---|---|
| CSS 变量 | base.css/app.html 定义 0 个；全项目去重 59 个，分散三套 |
| 颜色字面量 | 1,328 次（裸写 519 + fallback 757）；蓝相近似色 97 个 hex；红色 20 种、绿 6 种、橙 12 种，无语义色 token |
| border-radius | 258 次 / 20 种值（8/9/10/11/12/14 六档挤在一起） |
| box-shadow | 87 次 / 42 种写法 |
| font-size | 306 次 / 37 种值（含 `15.5px`、15 个 clamp、rem/em 混用） |
| font-family | 3 套互斥栈：路由层 Windows 优先（`Segoe UI, Microsoft YaHei`），便笺内容 macOS 优先（`SF Pro Text, PingFang SC`），等宽栈 3 种写法（其一把比例字体放首位） |
| 间距 | 744 个值 / 24 种；6px(106)、8px(146)、10px(108) 三足鼎立，无网格 |
| 暗色 | 仅 workspace 窗口支持；29 处写死 `#fff` 浅色背景（含工作台内 `WorkspaceSettingsGeneralSection.svelte:336`） |
| a11y | `outline:none` 25 处 vs `:focus-visible` 仅 8 处；19 个文件焦点完全不可见（含全部搜索/设置输入框）；3 个 dialog 均无 `aria-modal`/focus trap；22 处 `svelte-ignore a11y_*`；aria-label 全部未 i18n |
| 动效 | duration 6 档（0.12–0.3s 并存）；8 处 `transition: all`；高频操作（tab 切换/inspector 开合）无过渡，主题切换却有 760–820ms 心形扩散动画 |
| 组件规模 | 最大 4 个文件占组件代码 24%：`workspace/+page.svelte` 1460、`WorkspaceFocusHub.svelte` 1396、`note/[id]/+page.svelte` 1277、`BlockNoteContent.svelte` 1240 |
| i18n | strings.js en/zh 各 423 键零缺失、覆盖 84% 组件（好）；但 break-overlay 兜底文案硬编码中文、`PanelHeader.svelte:40` 用正则从翻译串里剥文案、aria-label 全英文硬编码 |

## 二、mini 模式（面板 + 贴纸窗口）

### High

- H1 设置弹窗溢出窗口：`SettingsDialog.svelte:232` 宽 380px > 窗口 360px（tauri.conf.json 18-19），纵向 ≈530px > 500px，关闭按钮被挤出且无滚动容器。`EditDialog.svelte:41` min-width 320px 同类。
- H2 自定义开关无键盘焦点：`SettingsDialog.svelte:354` input `opacity:0` 后无 `:focus-visible + .slider` 规则，8 个开关全部键盘不可见。
- H3 面板几乎零 focus 样式：`PanelHeader.svelte:259` 主输入框 `border:none; outline:none`；SearchBar / NoteTagsEditor / SortModeMenu 等零 `:focus-visible`。
- H4 主列表无空态/加载态：`NotesLinearList.svelte:30` 空列表渲染纯白；首启/搜索无果/回收站空均空白。贴纸窗口 `note/[id]/+page.svelte:1147` `Loading...` 硬编码英文且 `.loading` 无任何样式。
- H5 贴纸工具栏默认必换行并压正文：`NoteToolbar.svelte:402` 9 个按钮需 ≈358px，贴纸默认 300px；遮罩 `.toolbar-mask` 固定 `height:104px` 不随行数变化。
- H6 颜色 popover magic number 定位：`NoteToolbar.svelte:516` `right:84px/46px; bottom:72px` 与条件渲染的触发按钮脱钩，常态错位。
- H7 图标四套混用：同一工具栏并存 Material 填充 SVG、Lucide 描边 SVG、emoji（`:163` 🎨，title 还是硬编码英文）、文字字形（`A`、`◐`、`❆`）；面板侧 `➤`、`✕`；SVG path 跨文件复制无图标组件层。
- H8 四种互不相干的强调色：`#546e7a`（--primary）、`rgba(58,111,247,*)`（SearchBar 聚焦光环）、`#0f4c81`（工具栏 active）、`#1d4ed8`（--ws-accent fallback）。`SearchBar.svelte:66` 同一聚焦态混两种色相。

### Medium

- M1 列表操作按钮 24×24（低于 32px 建议），单条最多 7 个按钮挤压正文到 ~110px 宽（`NotesLinearListItem.svelte:403,481`）。
- M2 正文截断三处 magic number 不一致且硬裁切：`70px` / `3.05em` / `62px`；对比 `WorkbenchNoteGrid.svelte:396` 已用 line-clamp。
- M3 对比度不达标：`.note-date #98a2b3`≈2.5:1、`.settings-section h4 #999`≈2.8:1、action-btn 叠 opacity 后 ≈2.3:1。
- M4 拖拽落点指示线 1px + 16% 透明度，肉眼不可见（`NotesLinearList.svelte:120`）。
- M5 Escape 冲突：`+page.svelte:349` 全局 Esc 直接隐藏窗口，弹窗无自身 Esc 处理，打开弹窗时按 Esc 隐藏整个面板且状态残留。
- M6 弹窗无 `aria-modal`/`aria-labelledby`/focus trap/自动聚焦，且无出入场过渡。
- M7 SortModeMenu 无视口边界钳制、无 flip、无 ARIA（对比 `WorkbenchSection.svelte:300` 已有完整实现，同库水平差距）。
- M8 样式复制漂移：`.icon-btn` 两份不同步；`.note-text.rendered` 三份近似复制（字号 15/15/13）；`.action-btn` 两份（圆角 8 vs 4）。
- M9 内联样式绕过样式表：危险红内联 `#ef5350` 与 `.danger #e53935` 不是同一红；Dismissible 手势背景色以 props 硬编码。
- M10 原生控件裸奔：语言/优先级 `<select>`、两个 `input[type=range]` 全系统默认样式，滑块无数值标签（状态定义了却未渲染）。
- M11 未本地化文案：`NoteTagsEditor.svelte:149` 硬编码「标签」、aria-label 硬编码英文、`Q1~Q4` 写死。

### Low

- 字体栈分裂（面板 Windows 栈 vs 贴纸 macOS 栈）；字号 9 档无 scale；`NotePreview` 标题比正文小（15.5px 正文 vs h4 0.92rem）。
- 滚动条完全隐藏无可滚动提示（贴纸/NotePreview/象限板）。
- `.tool-btn` hover 无 transition、无 `:active`、无 `:focus-visible`；开关态仅靠颜色传达、无 `aria-pressed`。
- 恢复提示 `NotesStorageRecoveryNotice` 占满全窗且配色游离，focus ring 是第四种蓝。
- 死代码 ~800 行：`NotePreview.svelte`、`SourceEditorPane.svelte`、`CreateTagSelect.svelte` 无人 import；`NotesQuadrantBoard.svelte` 分支不可达（`panel-note-selectors.js:5` 无 quadrant）；`BlockNoteContent.svelte:892` `class:compact` 无对应规则；`NotesQuadrantBoard` 内媒体查询永不生效。

## 三、workstation 模式

### High

- H1 主题 token 三处重复、两处死代码：`workspace/+page.svelte:1110-1182`、`WorkspaceSettingsDialog.svelte:201-254`、`theme-presets.js` 三份；内联 `workspaceThemeVarStyle`（:900）优先级压过 class 规则，`.workspace.theme-dark {}` 两处永不生效，改主题要同步 3 处其中 2 处无效。
- H2 `color-mix(..., #ffffff)` 烧死亮色假设 → 暗色主题崩坏：最重是复盘日历 `WorkspaceReviewCalendar.svelte:231-299`（heat-1..4/today/selected 全部混白）；同类散布 ReviewLogList / ReviewHub / CreateBar / TaskTimeline / FocusHubView。而 `WorkspaceFocusStats.svelte:172` 同语义热力格用了正确的 `color-mix(..., transparent)`——同一语义两套互斥实现。
- H3 白色 bevel 内阴影 `inset 0 1px 0 #fff 70-88%` 散布 20+ 处，暗色下变亮白描边，应抽 `--ws-bevel-highlight`。
- H4 默认主题模板锁死主题切换：`theme-default-template-sections.js:5` 只取 light preset 且全量 `!important`，用户粘贴模板后切 dark/forest 全部失效（结构性缺陷）。
- H5 语义 token 名存实亡：`--ws-text-2` 从未被 preset 定义（`WorkspaceFocusHubView.svelte:312` 永久 fallback）；`--ws-accent-strong` 被强制等于 `--ws-accent`，6 处「加深」交互反馈视觉差为 0；同 token fallback 跨文件矛盾（蓝 `#163ea8` vs 青 `#0f766e`）。
- H6 break-overlay 完全脱离主题与 i18n：`break-overlay/+page.svelte:294` 硬编码 `#4f989b`；`:12-27` 自带 navigator.language 判断绕开 getStrings，改语言不生效；动作按钮无按钮可供性。
- H7 焦点可见性全线缺失：workspace 目录仅 2 处 `:focus-visible`，10 余处 `outline:none` 无替代；侧栏导航/复盘卡片/番茄任务键盘导航零反馈。
- H8 同名 class 两套外观：`.action-btn` 在 GeneralSection（圆角 10px+hover 上浮）与 StorageSection（透明+圆角 0）完全相反；错误色一处 `#dc2626` 一处 `#b45309`。

### Medium

- M1 主按钮 5 套外观（FocusPlanner 深藏青渐变 / CreateBar 浅蓝渐变 / ReviewLogList 实心 accent / FocusHubView 10% 浅底 / TaskItem tiny 版）。
- M2 圆角 10 种并存；同为内容卡片 14px vs 16px vs 11px；settings/WindowBar/sidebar 大量 `border-radius:0`。
- M3 语义色无 token：成功/进行中 5 种绿青、危险/逾期 5 种红。
- M4 布尔开关 3 种形态（iOS 滑块 / Off-On 分段 / 圆点+ON 文本）。
- M5 字号混乱：9-20px + 15 个 clamp；h3 在五个面板取 5 种不同值；侧栏 9px 文字用 `--ws-muted` 对比度不足。
- M6 断点碎片化：11 个不同断点无共享变量；`WorkspaceFocusPlanner.svelte:362-378` 的 1220px 媒体块与 1700px 块完全相同，纯死代码。
- M7 settings 四个 section「无内边距的边框」盒子套盒子，四份逐字复制。
- M8 WindowBar 与全局割裂：`.bar-btn` 圆角 0；`.dot` 硬编码橙色渐变与任何主题 accent 无关。
- M9 侧栏硬编码边框色 `#dbe4f2`/`#dce3ef`（同文件已定义 `--sidebar-divider-color` 却没用）。
- M10 `.btn.danger` 名不副实（实际是关闭按钮），暗色下经 `:global` 硬编码橙红，与 forest 主题冲突。
- M11 侧栏两组导航激活态不一致（Modules 有 2px 指示条，NoteFilters 只有背景）。
- M12 滚动条三种策略（隐藏 / 8px / 6px），侧栏隐藏后溢出无提示。
- M13 巨型组件：`+page.svelte` 1460 行含手写 14 顶点心形 clip-path；`WorkspaceFocusHub.svelte` 20+ `$effect` 及 `const _x = …; void _x` 哑变量假订阅模式。

### Low

- 🍅 emoji 9 处与线性 SVG 混用；`!`、`✓`、`+`、`#`、`?` 文字充当图标。
- 两套 tooltip（HelpTip 原生 title vs ReviewCalendar 自绘带箭头）。
- 动效轻重倒置：tab 切换/inspector 开合瞬间跳变，主题切换 760-820ms 扩散动画。
- magic number：`inspectorWidth 430` 两处、`sidebarCollapsed <= 92` 无解释、viewport-layout.js 十余个无注释常量。
- mac 交通灯占位耦合脆弱（绝对定位 14/16px vs 侧栏 hidden 占位，两处数值无关联）；常显不符 macOS 惯例。
- 自定义 CSS 无语法校验/错误提示/预览，写坏可整屏失效。
- preset 仅 5 个且只有颜色维度，缺「跟随系统」；主题只能换色换不了风格。
- 空态参差：ReviewLogList 有完整空态，Planner/Deadlines/TagRail/Timeline 只有一行灰字；全项目无骨架屏。
- 小窗高度争抢：planner/timer/task-list 多个 `clamp(*vh)` 叠加，<700px 高互相挤压。

## 四、整改路线（建议阶段）

### Phase 0：止血（独立小改，可立即做）

1. 修 mini 设置弹窗溢出（H1）：宽度 ≤ 面板宽 − 32，内容区可滚动。
2. 修贴纸工具栏换行压正文（H5）+ popover 锚定改为跟随触发按钮。
3. 补主列表空态（首启/搜索无果/归档/回收站四种文案已可放 strings.js）与贴纸 loading 态。
4. 修 Escape 冲突：弹窗打开时 Esc 先关弹窗。
5. 删死代码：NotePreview / SourceEditorPane / CreateTagSelect / NotesQuadrantBoard（~800 行）+ FocusPlanner 死媒体块 + 两份死 theme-dark token 块。

### Phase 1：Token 层（root 级设计系统）

1. `base.css` 建 `:root` token：颜色（含 `--ws-success/--ws-danger/--ws-warning/--ws-bevel-highlight/--ws-surface-elevated`）、spacing（4px 网格）、radius（3 档 + full）、shadow（3 档）、type scale、z-index、duration/easing、focus-ring。
2. 三窗口共用同一注入函数：合并 `--primary` 六件套与 `--ws-*`，mini 面板与贴纸窗口获得主题/暗色能力；删 `WorkspaceSettingsDialog` 复制版 token（单一真源 theme-presets.js）。
3. 批量替换 `var(--x, #hex)` fallback 与裸写颜色（757 + 519 处，可脚本辅助）。
4. 修 H2/H3：`color-mix(..., #ffffff)` → `color-mix(..., transparent)` 或 surface token；bevel 抽 token。
5. 修 H4：默认模板去 `!important`、按当前 preset 生成。

### Phase 2：基础组件收敛

1. `.ws-btn`（primary/ghost/danger 三变体）收敛 5 套主按钮 + 同名 class 冲突。
2. `.ws-card` 收敛圆角/阴影/边框；settings section 去「盒子套盒子」。
3. 统一开关组件（一种形态）；统一 tooltip；统一滚动条策略（细滚动条，不全隐藏）。
4. 图标组件层：SVG 统一为一套描边体系，替换 emoji/文字字形，替换重复内联 path。

### Phase 3：可访问性与动效

1. 全局 focus-ring token + 规则「`outline:none` 必须伴随 `:focus-visible`」；补 19 个文件。
2. 弹窗 `aria-modal` + focus trap + 自动聚焦 + Esc；菜单 ARIA + 视口钳制（复用 WorkbenchSection 实现）。
3. aria-label 接入 strings.js；break-overlay 接入 getStrings。
4. 动效统一 duration/easing token；高频操作补轻过渡；补 `prefers-reduced-motion`。
5. 对比度过一遍 AA（date/muted/9px 文字）。

### Phase 4：重构与打磨

1. 拆分四大巨型文件（workspace/+page 1460、FocusHub 1396、note/[id] 1277、BlockNoteContent 1240）。
2. 断点收敛为 3-4 个共享变量；magic number 常量化并注释。
3. 空态/加载态统一模式（参照 ReviewLogList）；正文截断统一 line-clamp。
4. 主题 preset 扩展维度（radius/spacing/shadow）+「跟随系统」+ 自定义 CSS 校验反馈。

## 验收基线（整改完成的量化标准)

- 组件内裸写颜色 < 50 处（现 519）；box-shadow ≤ 6 种；radius ≤ 5 种；font-size 走 scale。
- `outline:none` 无 `:focus-visible` 替代的文件数 = 0（现 19）。
- dark/forest preset 下复盘日历、任务卡、创建栏无白块反转。
- mini 面板与贴纸窗口支持暗色。
- 死代码清单全部删除，`svelte-ignore a11y_*` < 5 处（现 22）。
