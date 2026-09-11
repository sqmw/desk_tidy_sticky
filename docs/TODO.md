# Project TODO

状态：活跃主 TODO

维护原则：只记录当前主线、阶段状态、阻塞与专题索引；详细方案放入对应专题文档。

## Milestones

### M-EXT-01 · 第三方插件与双移动端课表

<a id="m-ext-01"></a>

状态：in_progress（进入跨端插件可行性实施；尚未开放安装）。

目标：桌面、Android、iOS 可安装第三方插件，以课表 JSON 导入、展示和提醒形成首个闭环；首期手动导入导出，自动同步后续单独规划。

验收：外部插件无需重编宿主即可安装；课表使用相同公开接口，三端课程语义一致；坏输入不覆盖、重复导入不重复提醒；插件停用/升级和后台/锁屏提醒均有证据。典型未达成：仅内置开关、只运行一端、插件直接共享核心权限、只能前台提醒。

归属 Task：[T-PLUGIN-PLATFORM-VALIDATION](#t-plugin-platform-validation)、[T-PLUGIN-HOST](#t-plugin-host)、[T-MOBILE-BASE](#t-mobile-base)、[T-TIMETABLE-PLUGIN](#t-timetable-plugin)、[T-EXT-CROSSPLATFORM-ACCEPTANCE](#t-ext-crossplatform-acceptance)。

依据：[D-EXT-001](DECISIONS.md#d-ext-001)、[D-EXT-002](DECISIONS.md#d-ext-002)、[D-EXT-003](DECISIONS.md#d-ext-003)；[规划 v3](plans/2026-09-10-plugins-mobile-timetable.md)。iOS 当前按非 App Store 首发规划，未来上架单独评估；首选 JS/TS 插件验证，具体容器、签名安装方式和能力集仍需验证。

计划外占比：结构化活跃记录口径为 1/6；存量六项活跃记录缺少里程碑归属字段，不能据此给出全项目比例，本轮不补造历史归属。

## Active

### T-PLUGIN-PLATFORM-VALIDATION · 跨端插件运行与分发可行性

<a id="t-plugin-platform-validation"></a>

```tracking-task
{"id":"T-PLUGIN-PLATFORM-VALIDATION","name":"跨端插件运行与分发可行性","goal":"明确第三方插件在Android/iOS目标渠道可落地的运行边界","scope":"外部插件包加载、隔离与权限拒绝、用户文件导入和系统提醒最小验证；不构建完整商店或重写宿主","acceptance":"两端都有目标设备/渠道证据或清楚的不可行结论；能据此选择运行形态；不以桌面成功替代手机结果","dependencies":[],"version":"v1","mode":"staged","status":"in_progress","execution_ref":"STEPS.md#t-plugin-platform-validation","acceptance_evidence":[],"priority":"high","milestone":"M-EXT-01","decisions":["D-EXT-001","D-EXT-002","D-EXT-003"]}
```

当前执行：[步骤与证据](STEPS.md#t-plugin-platform-validation)；[实施基线](plugins/implementation-baseline.md)。Android/API35与iOS26.5模拟器均已通过同JS/JSON导入、持久化重开、后台提醒与取消；E-006已收口。尚无真机/完整平台矩阵或安全放行，不开放产品插件安装。

### T-PLUGIN-HOST · 第三方插件宿主

<a id="t-plugin-host"></a>

```tracking-task
{"id":"T-PLUGIN-HOST","name":"第三方插件宿主","goal":"用户无需重编宿主即可安装、启停和升级遵循协议的第三方插件","scope":"插件包校验、宿主协议、权限与存储隔离、扩展点、生命周期和异常处理；不含在线商店/付费平台","acceptance":"外部测试插件走正常安装路径；越权调用被拒；停用撤销其提醒，数据处置明确；升级失败可恢复且核心笔记不受损","dependencies":["T-PLUGIN-PLATFORM-VALIDATION"],"version":"v1","mode":"staged","status":"pending","execution_ref":"","acceptance_evidence":[],"priority":"high","milestone":"M-EXT-01","decisions":["D-EXT-001","D-EXT-002"]}
```

待开始（不预建步骤块）；范围与平台限制见[规划草案](plans/2026-09-10-plugins-mobile-timetable.md)。

### T-MOBILE-BASE · Android 与 iOS 基础客户端

<a id="t-mobile-base"></a>

```tracking-task
{"id":"T-MOBILE-BASE","name":"Android 与 iOS 基础客户端","goal":"在两种移动平台提供可用的基础笔记与插件承载入口","scope":"平台依赖拆分、触屏页面、应用存储、文件选择和手动导入导出、通知权限；不承诺桌面置顶/托盘等能力；无自动同步","acceptance":"Android/iOS 真机可运行；基础笔记与文件往返通过；插件承载与宿主合同接通；权限拒绝有解释，桌面行为回归通过","dependencies":["T-PLUGIN-PLATFORM-VALIDATION"],"version":"v1","mode":"staged","status":"pending","execution_ref":"","acceptance_evidence":[],"priority":"high","milestone":"M-EXT-01","decisions":["D-EXT-001","D-EXT-002"]}
```

待开始（不预建步骤块）；范围与平台限制见[规划草案](plans/2026-09-10-plugins-mobile-timetable.md)。

### T-TIMETABLE-PLUGIN · 课表插件与 JSON 规范

<a id="t-timetable-plugin"></a>

```tracking-task
{"id":"T-TIMETABLE-PLUGIN","name":"课表插件与 JSON 规范","goal":"通过正常插件协议导入、展示课表并管理上课提醒","scope":"版本化课表JSON、学期/周次/节次、今日/周视图、调停课、提醒和手动导出；不含学校爬取、OCR或自动同步","acceptance":"坏数据不覆盖旧课表，重复导入不重复创建；单双周和例外正确；调整/停用取消陈旧提醒；桌面与移动解析同一课表语义一致","dependencies":["T-PLUGIN-HOST"],"version":"v1","mode":"staged","status":"pending","execution_ref":"","acceptance_evidence":[],"priority":"high","milestone":"M-EXT-01","decisions":["D-EXT-001"]}
```

待开始（不预建步骤块）；范围与平台限制见[规划草案](plans/2026-09-10-plugins-mobile-timetable.md)。

### T-EXT-CROSSPLATFORM-ACCEPTANCE · 跨端插件与课表集成验收

<a id="t-ext-crossplatform-acceptance"></a>

```tracking-task
{"id":"T-EXT-CROSSPLATFORM-ACCEPTANCE","name":"跨端插件与课表集成验收","goal":"证明桌面、Android、iOS的第三方插件与课表使用闭环","scope":"真实安装/升级/停用、JSON往返、课程显示、通知生命周期及核心功能回归；不以首期交付承诺自动同步","acceptance":"三类平台安装课表插件，无宿主专用后门；手动导入后课程与设置一致；后台/锁屏及权限变化结果有设备证据；不支持的系统行为明确展示","dependencies":["T-PLUGIN-HOST","T-MOBILE-BASE","T-TIMETABLE-PLUGIN"],"version":"v1","mode":"staged","status":"pending","execution_ref":"","acceptance_evidence":[],"priority":"high","milestone":"M-EXT-01","decisions":["D-EXT-001"]}
```

待开始（不预建步骤块）；范围与平台限制见[规划草案](plans/2026-09-10-plugins-mobile-timetable.md)。

### T-PROJECT-REVIEW-FIX · 全量审查缺陷整改

<a id="t-project-review-fix"></a>

```tracking-task
{"id":"T-PROJECT-REVIEW-FIX","name":"全量审查缺陷整改","version":"v1","mode":"staged","status":"blocked","goal":"消除全量审查确认的数据损失和功能缺陷","scope":"报告 R01–R12；窗口现场疑点先取证，不把未经证实的激活顺序作为修复基线；跨进程隔离方案另核对授权","acceptance":"R01–R12 各自反例通过对应回归验证；原有检查通过，真实窗口与 Windows 差异明确验收；数据丢失、失败回滚和并发更新路径有反向测试","execution_ref":"STEPS.md#t-project-review-fix","acceptance_evidence":[],"priority":"high","unplanned_reason":"2026-09-10 全量 review 发现；用户已授权编写方案并按文档实施","dependencies":["T-PROJECT-REVIEW"]}
```

执行基线：[整改方案 @v1](plans/2026-09-10-review-remediation.md)；[步骤与执行](STEPS.md#t-project-review-fix)。发现证据保留在 [R01–R12 报告](reviews/2026-09-10-project-review.md)。

交接：R01–R12 源码与自动回归完成，1.2.6 已更新到本机安装位置，真实 launchd 启动及原生编辑关闭通过，见 [安装验收](releases/2026-09-10-local-1.2.6-acceptance.md)。托盘直接点击结果待反馈；Windows 仅发现一块活动物理屏幕，混合 DPI 双屏与真实重启未验收。Task 不以安装完成或单测通过代替这些现场证据。

### <a id="todo-t-stk-p0-data-safety"></a>T-STK-P0-DATA-SAFETY：贴纸数据安全 P0 修复

状态：in_progress（步骤见 [STEPS 活跃块](STEPS.md#steps-t-stk-p0-data-safety)）

优先级：high

任务定义 v1：

- 是什么：修复 `docs/issues/2026-08-10-sticky-full-scan.md` 判定为 P0 的四条数据安全缺陷——A1 控制态尺寸被后端按扩展窗口持久化、A2 已隐藏贴纸重复隐藏覆盖可见坐标、A3 隐藏态切换层级后贴纸留在屏幕外且唤不回、A4 块编辑器三条写入路径吞掉保存失败；并入同函数的 A5（`activeBlockInitialDraft` 未重置）与 C1（图片粘贴绕过内联色重算）。
- 边界：不包含 B1 混合 DPI 坐标空间口径、B2 macOS `order_out` 生命周期取舍、F4 release devtools 策略，以及扫描文档 P1-P3 的其余条目；不改动视觉 token、暗色与巨型文件拆分。
- 做完算什么：六条各有代码修复与对应自动化测试（不可自动化的须写明原因）；`make check`、Rust 测试、前端测试与 `git diff --check` 全绿；扫描文档逐条标记状态。

关联文档：

- `docs/issues/2026-08-10-sticky-full-scan.md`（问题台账、批次划分与第 8 节修复记录）

进度（2026-08-10）：六条代码修复与自动化测试全部完成，`make check` / `make test` / `git diff --check` 全绿，Rust 测试 19 → 31、前端测试 15 → 18。

当前下一步：仅剩实机冒烟验收（扫描文档第 8 节 5 项），未通过前不转 `done`。自动化门禁覆盖不到窗口几何、层级切换与存储恢复态这三类真实运行行为。

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
- `docs/issues/2026-08-10-sticky-full-scan.md`（贴纸链路全量问题扫描：数据正确性 / 窗口生命周期 / 资源 / 债务对账 + P0-P3 批次）

本轮范围（2026-07-29）：

1. 保留原产品策略：进入控制 / 编辑态时，上下控制区在透明窗口预留中展开，必要时同时向左右扩窗；正文区域尺寸和屏幕坐标不变。上下控制区采用独立悬浮浮岛，工具操作全部直达，不使用“更多”菜单。
2. 顶部与底部采用按内容收口的浮动控制轨，以 180ms 外向位移/缩放/淡入呈现；窄窗口自然换行并按实际高度扩窗，减少动态效果模式下关闭动画。
3. 移除覆盖正文的顶部拖拽柄、活动块整框、额外块间距和列表二次缩进；恢复正文表面的原有拖动命中，以 `grab` / `grabbing` 光标反馈可拖状态，非活动内容不因进入编辑态发生位置变化。
4. 收敛浏览 / 控制 / 活动块编辑状态，保留外部更新草稿保护、退出前提交和图片粘贴。
5. 保持 Markdown-first 单活动块架构；跨块选择、块拖拽排序及模型驱动编辑器仍归入后续 S6。
6. 2026-08-01 修复中文 IME 候选确认：composition 期间 Enter / Tab / 方向键优先交给输入法，不进入块拆分、列表续行或命令选择逻辑。
7. 2026-08-01 修复透明度 `0` 被重置为 `1` 和正文底色重复叠加；磨砂强度现在同时控制 blur 与单层色膜透出量，确保从 0 到 1 有连续可见变化。

验收门禁：`make check`、前端测试、`git diff --check`，并在可运行的 Tauri 环境人工回归向下扩窗、中文输入、文本复制、Esc 分层与外部更新冲突提示。

纠偏证据：组件预览测得 ordered-list 编辑前后 `top/left` 相同，高度仅有 `0.09px` 浏览器舍入差；h1 编辑后后续内容位移为 `0.20px` 舍入差。第二轮修复移除了误伤整块正文的拖动拦截，并用可测试窗口框架保持贴纸矩形坐标。第三轮把宽窗顶部/底部控制轨收口到约 233px/343px。第四轮移除原生整窗外壳感：顶部浮岛约 287×56px，底部四组单行浮岛约 384×46px；纯函数测试覆盖左右/上下扩窗和拖动持久化坐标守恒。追加修复绕过 Tauri 2 在 macOS 上不执行 `set_effects(None)` 的平台缺口，显式清除全部残留 vibrancy 视图并在重启磨砂前去重。2026-08-01 新增 IME 事件优先级、透明度零值和磨砂表面 alpha 测试。真实 Tauri 窗口仍需人工回归控制态透明外壳、中文输入法候选确认、透明度/磨砂端点、窗口拖动、图片粘贴与外部冲突流程。

### Sticky Edge Auto Hide

状态：in_progress

优先级：medium

目标：实现已钉在桌面且置顶显示的贴纸隐藏能力，并闭环屏幕边缘直接唤回、显示器切换可达性和元数据事件隔离。

关联文档：

- `docs/ui/2026-07-04-sticky-edge-auto-hide-plan.md`
- `docs/issues/2026-08-10-sticky-full-scan.md`（本专题相关：A2 重复隐藏覆盖可见坐标、A3 隐藏态切层级丢贴纸、B1 混合 DPI 坐标空间、B5 归位无条件写盘、B7 恢复线程并发）

当前下一步：

1. 已实现 Note 持久化字段、Rust 统一隐藏 / 显示命令、`activeTopmostEditingNoteId` tracker、`Ctrl+Shift+H` 全局快捷键、贴纸工具栏“溢边隐藏”开关和拖动溢边触发。
2. 验证已通过：`cargo test --manifest-path src-tauri/Cargo.toml sticky::auto_hide`、`make check`、`make build`。真实运行验证使用临时 `HOME` 启动开发版 Tauri，并设置 `DESK_TIDY_STICKY_RUNTIME_CHECK=sticky_auto_hide`；日志已出现 `hide active note`、`reveal hidden note`、`hide overflowed note`、`reveal overflow hidden note` 和 `sticky_auto_hide PASS`。
3. 2026-07-31 修复外置工具栏导致的正文可见边丢失：边缘计算改用正文矩形，屏幕范围改用 monitor work area，窗口就绪时归一化失效坐标。
4. 2026-07-31 增加四边 `wheel` 手势唤回和点击兜底；自动隐藏事件改为 metadata，外部更新提示只由真实未提交草稿与文本事件共同触发。
5. 2026-08-01 修复 Windows 总开关重建隐藏贴纸时的位置收敛：恢复逻辑沿隐藏边优先使用持久化可见坐标，不再把系统创建离屏窗口时的临时夹取位置写回为真实位置。
6. 2026-08-06 修复 Windows 显示器关闭再开启后的错误展开与错位：贴纸快捷键在 Windows 上仅接受 30ms 至 2s 内完成的按下/释放意图，过滤亮屏时的瞬时或跨休眠事件；运行中的 hidden 窗口被系统挪动时按窗口分别防抖归一化，只恢复原贴边 8px 可见边，不切换为 visible。
7. 自动验证：macOS `make check`、15 项前端测试和 19 项 Rust 测试通过；Syncthing 同步后的 Windows 原生 `cargo check` 与 19 项 Rust 测试通过，覆盖快捷键意图门禁、陈旧事件拒绝、多窗口位移防抖、隐藏坐标恢复和数据安全。待验收：Windows 实机关屏/亮屏后仍保持原收起位置、关闭/开启桌面贴纸后的同边多贴纸间距、macOS / Windows 实机双指手势、首次隐藏柄命中和运行中断开显示器。
8. 2026-08-06 闭环 Windows WorkerW 脱离回归：恢复顶层样式后使用 `SetParent(hwnd, NULL)`，并显式识别 `NULL + error 0` 为合法顶层状态；Windows 原生 `cargo check` 与 21 项 Rust 测试通过。待实机验收：启动及置底 -> 置顶切换不再打印 detach error 0，层级与拖动正常。
9. 后续候选入口：面板 / workstation 卡片上的“显示隐藏贴纸”按钮和托盘入口，不阻塞当前边缘闭环验收。
10. 2026-08-10 全量扫描的 P0 数据安全项已在 [T-STK-P0-DATA-SAFETY](#todo-t-stk-p0-data-safety) 下修复：A2 已隐藏贴纸重复隐藏覆盖可见坐标、A3 隐藏态切换层级后贴纸留在屏幕外且唤不回，两条均属本专题；剩余实机冒烟见该条目。本专题原有的待验收项不受影响。

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

### T-PLUGIN-MOBILE-PLAN · 插件与移动端里程碑规划

<a id="t-plugin-mobile-plan"></a>

```tracking-task
{"id":"T-PLUGIN-MOBILE-PLAN","name":"插件与移动端里程碑规划","version":"v1","mode":"lightweight","status":"done","goal":"把用户确认的插件、Android/iOS与课表目标转成可审阅的里程碑规划","scope":"仅产品范围、候选架构、数据合同方向、任务依赖与验收；不实施业务代码、不冻结尚未选择的运行形态或分发渠道","acceptance":"三个范围选择准确入档；主 TODO 有里程碑及任务归属；课表数据和提醒生命周期有验收；iOS渠道与运行形态待决策明确","execution_ref":"archive/2026-09-10-plugin-mobile-planning.md#t-plugin-mobile-plan","acceptance_evidence":["D-EXT-001 准确记录用户三个范围选择；M-EXT-01 与五项pending Task归属明确","plans/2026-09-10-plugins-mobile-timetable.md 包含数据、权限、提醒验收与iOS渠道待决策；未修改业务源码","E-002：D-EXT-002 记录当前非商店首发且保留未来选择；规划 v2 明确 JS/TS 首选、业务协议与平台/渠道分离及审核证据边界"],"unplanned_reason":"用户提出新里程碑并回答范围问题"}
```

目的意图：把用户已决定的产品范围落到单一里程碑与可审阅草案；方案中的技术候选不冒充已批准实现。界面与第三方运行权限的成本在实施前可见。

[执行证据](archive/2026-09-10-plugin-mobile-planning.md#t-plugin-mobile-plan)。

E-002 目的意图：把用户当前非 App Store 首发的选择与未来上架兼容区分，保留 JS/TS 首选路线但不冻结容器实现，不把“首期不上架”解释为无限权限。

[E-002 执行证据](archive/2026-09-10-plugin-mobile-planning.md#e-002)。

### T-PROJECT-REVIEW · 当前项目全量审查

<a id="t-project-review"></a>

```tracking-task
{"id":"T-PROJECT-REVIEW","name":"当前项目全量审查","version":"v1","mode":"staged","status":"done","goal":"审查当前项目全部功能域并交付有触发条件、代码证据和验证边界的风险报告","scope":"029a623 基线的源码、配置、测试与文档；不修复业务代码，不操作真实用户数据或登录项","acceptance":"覆盖存储、编辑器、窗口、启动、专注休息、导入导出、安全和构建域；高优先级发现有可复查证据并排除重复与误报；运行现有检查并披露平台及运行验证限制；报告与跨轮处理项从主 TODO 可达","execution_ref":"archive/2026-09-10-project-review-execution.md#t-project-review","acceptance_evidence":["reviews/2026-09-10-project-review.md：功能域矩阵、8 P1/4 P2 证据和平台限制","现有 check/test/frontend build 通过；隔离反例验证；T-PROJECT-REVIEW-FIX 承接整改"],"priority":"high","unplanned_reason":"用户 2026-09-10 请求全量 review","dependencies":[]}
```

[审查报告](reviews/2026-09-10-project-review.md) · [执行证据](archive/2026-09-10-project-review-execution.md#t-project-review)。审查完成不表示缺陷已修复。

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
