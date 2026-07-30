# 2026-07-27 贴纸窗口与块编辑器全量核查

状态：audit done；第一轮整改完成（2026-07-29），其余条目继续按 S1-S6 跟踪。方法：代理全量读贴纸链路代码（note 路由 1288 行 + note 组件 2345 行 + note/lib 与 markdown/lib 共 5918 行），全部发现带文件与行号锚点。

## 高危发现速览(完整清单见下)

- A1 `--ws-*` 对贴纸全部失效(30 处引用永远走 fallback,accent 两窗口不同色)
- A3 零暗色支持,工具栏/遮罩烧死白色,深色贴纸底色下变白板
- B1 工具栏 11 键必换行,内嵌态遮罩吃掉小贴纸一半正文
- B2 popover 锚定回退为工具栏居中(anchor 被 `position:static` 杀掉)
- B3 渲染态 `user-select:none` + 拖拽接管 → 无法选中复制文本
- C1 块无 hover 态、cursor:default → 无法感知"这是可编辑单元"
- C2 点击进入编辑不映射光标,caret 永远跳块首
- C3 编辑/渲染态视觉不一致(标题掉字号、列表左移 20px、引用条消失)
- C4 块间距为 0,空行块高度 0 且不可点击
- C5 编辑冲突静默丢草稿(`onConflict` 未接线)
- C7 图片粘贴链路断裂:后端命令在、前端实现文件(note-editor-actions.js 184 行)无人 import
- D1 两个巨型文件合计 2528 行(路由 1288 + BlockNoteContent 1240)
- D2 死代码 ~250+ 行(含被一行 CSS 关掉的 todo 追加按钮 C9)

## 完整报告

### A. 视觉层

- **A1(High)** `--ws-*` token 对贴纸窗口完全失效:定义只在 `.workspace`(`src/routes/workspace/+page.svelte:1110-1144`,另一份复制在 `WorkspaceSettingsDialog.svelte:202-222` 且数值已漂移);贴纸根 `.note-shell`(`note/[id]/+page.svelte:1079`)不在其子树。消费点 30 处全走 fallback:`BlockNoteContent.svelte:999,1024,1108,1158,1173,1186,1212,1223,1231,1234`、`NoteTagsEditor.svelte:190-306`(18 处)、`NoteTagBar.svelte:43,45`。accent 在 workspace 是 #2563eb、贴纸恒为 #1d4ed8。
- **A2(High)** `--note-*` 只有 8 个渲染参数(`+page.svelte:1095`),无语义 token 层;`--note-inner-highlight-alpha` 是死 token(`:78,1095` 注入、无消费)。
- **A3(High)** 零暗色:全仓库 `prefers-color-scheme` 0 次;白色烧死点 `NoteToolbar.svelte:344,345,371,404,432-439,477,491,508,522,539,592`、`+page.svelte:1196,1214-1220`;`--note-text-color` 仅 `BlockNoteContent.svelte:999` 消费,工具栏/标签栏/HUD 不跟随。
- **A4(High)** 字体栈三套:正文 macOS 栈(`BlockNoteContent.svelte:1000`)vs 面板/workspace Windows 栈;贴纸外壳、工具栏、标签栏、HUD 无 font-family(走 WebView 默认)。
- **A5(Med)** 图标四体系混用:🎨(`NoteToolbar.svelte:181`)、文字字形 `A/◐/❆/+/×`(`:190,200,225`、`BlockNoteContent.svelte:953`、`NoteTagsEditor.svelte:131,138,146`、`renderer.js:313`)、描边 SVG(1.8)与填充 SVG 并存;control-exit 用 stroke 2(`:76-87`);未遵守 design_system.md 的 Filled/Wireframe 规则。
- **A6(Med)** 圆角 9 档、阴影 8 个字面量、间距无网格(锚点见 `+page.svelte:89,1199,1254,1281`、`NoteToolbar.svelte:343,348,374,396,411,480,541,546,594,597`、`BlockNoteContent.svelte:1185,1187,1197,1232`、`NoteTagsEditor.svelte:274,279`);`--ws-radius/shadow` token 一个未用。
- **A7(Med)** 对比度:`.loading` #8a94a6@12px(`+page.svelte:1171`)、tool-btn #4b5563 on 任意用户底色(`NoteToolbar.svelte:477,484`)、`.tool-btn.active` 仅色相区分激活(`:495-497`)、is-done opacity .68 二次衰减(`BlockNoteContent.svelte:1116-1119`)。
- **A8(Low)** focus-visible 仅 3 处,`outline:none` 主动去除 2 处(`BlockNoteContent.svelte:1016,1130`);工具栏/色板/滑杆/命令项/标签 chip 全缺。
- **A9(Low)** 工具栏 13 个按钮缺 `type="button"`(`NoteToolbar.svelte:99-309`)。

### B. 交互层

- **B1(High)** 工具栏 11 键 ≈430px 需求 vs 贴纸最小 220px(`+page.svelte:123`)→ 必换行 2-3 行;内嵌态绝对定位 + 白渐变遮罩(`NoteToolbar.svelte:334-337,427-445`)吃掉小贴纸下方 100-170px 正文。
- **B2(High)** popover 不锚定触发钮:`.tool-popover-anchor { position:static }`(`:526-531`)使所有面板以工具栏为包含块居中(`:533-549,586-602`);无 role/aria-expanded/局部 Esc/焦点管理。
- **B3(High)** 渲染态 `user-select:none`(`+page.svelte:1258`)+ `.note-block-surface` 在可拖拽清单(`note-window-drag.js:174`)→ 无法选中/复制文本,拖文字=移窗口。
- **B4(High)** `data-no-drag="true"`(`BlockNoteContent.svelte:892`、`NoteTagBar.svelte:24`)在贴纸拖拽控制器中无效(`note-window-drag.js:17-32` 不含该选择器;workspace 版支持)——两套拖拽实现清单漂移。
- **B5(Med)** 控制态开合物理改窗口高度(`+page.svelte:213-241,1069-1073`),容差+700ms 启发式与 4 条持久化路径竞态。
- **B6(Med)** 滚动条全隐藏(`+page.svelte:1255-1265`、`BlockNoteContent.svelte:1138-1148`)且无溢出提示。
- **B7(Med)** Esc 不分层:编辑态 Esc=提交+退控制态一次到底(`+page.svelte:1123,1128`、`BlockNoteContent.svelte:809-825`);无放弃修改路径;popover 无优先关闭。
- **B8(Med)** Tab 被无条件吞掉做缩进(`BlockNoteContent.svelte:739-744`);每块 role=button tabindex=0(20 段=20 个 tab stop),内嵌 checkbox/链接为非法嵌套(`renderer.js:303,221-222`)。
- **B9(Med)** 加载失败停在"加载中";只读贴纸仍显示可写 placeholder(`+page.svelte:1122`);正文下方空白区不可点击追加。
- **B10(Med)** 标签/优先级默认态不可见(`NoteTagBar.svelte:16,19` 仅控制/编辑态渲染)。
- **B11-13(Low)** 原生 title 提示;置顶贴纸 hover 工具栏被关且双击区被正文屏蔽(`+page.svelte:94,113,681-693`);control-exit 文案是"关闭"行为是"退出控制态"(`NoteToolbar.svelte:66-88`)。

### C. 块编辑器(重点)

- **C1(High)** 块无 hover 态、cursor:default(`BlockNoteContent.svelte:1019-1021`),唯一反馈是键盘 focus-visible。
- **C2(High)** 点击进入编辑不映射 caret(`:109-140,842-848` 不传 caretOffset)→ 光标跳块首。
- **C3(High)** 编辑/渲染态视觉跳变:列表左移 20px(`:1063-1066`)、引用左移+条消失(`:1068-1075`)、任务网格消失(`:1096-1102`)、h1 从 ~30px 掉回 15px(`:1046-1061` 未定义标题字号)、代码块变比例字体。
- **C4(High)** 块间 gap 0 + 全块 margin 0(`:997,1046-1061`)→ 无节奏;空行块渲染为空 p 高度 0 不可点(`block-parser.js:71-74`、`block-renderer.js:83`)。
- **C5(High)** 冲突静默丢草稿:`commitActiveBlock` range 不匹配即 cancel(`:159-181`);贴纸未传 `onConflict`(`+page.svelte:1116-1129`);外部 notes_changed 覆盖 text 即抹草稿(`:981-995`)。
- **C6(High)** 无块类型转换:命令目录仅 8 条内容插入(`command-catalog.js:4-13`),无 / 菜单、无快捷键。
- **C7(High)** 图片粘贴断链:后端 `save_clipboard_image` 就绪(`src-tauri/src/lib.rs:133`),前端唯一实现 `note-editor-actions.js:87-122` 全仓库无人 import,textarea 无 onpaste(`BlockNoteContent.svelte:911-944`)。
- **C8(Med)** 添加块可供性弱:+ 按钮仅编辑态右下角 20px(`:945-954,1150-1168`),aria/title 硬编码英文。
- **C9(Med)** todo:`.task-add` 功能完整却被 `display:none` 关掉(`:1121-1123`);checkbox 15px 热区、accent 变量在贴纸不解析;aria 硬编码英文(`renderer.js:313`)。
- **C10(Med)** 代码块:语言标记被丢弃(`block-renderer.js:76-81`)、贴纸窗口 pre/code 零样式、与 workbench 两处已写样式漂移。
- **C11(Med)** 表格:对齐信息忽略(`renderer.js:244,266-274`)、零样式、无编辑 UI。
- **C12(Med)** 图片:eager 加载、无占位/失败态/放大、尺寸靠非标语法(`renderer.js:107,72-90`)。
- **C13(Med)** hr 是死块:不可编辑且 `getPreviousEditableBlock` 跳不过它 → 编辑器内无法删除(`block-parser.js:40`、`BlockNoteContent.svelte:304-315,770-785`)。
- **C14(Med)** Enter 三套语义不可发现;code/table/quote 中间回车不断行(`:440-448`)。
- **C15(Med)** 提交后三次强制回写 scrollTop(`+page.svelte:509-529`);跨块导航无 scrollIntoView;多行块首行 ↑ 不跳块(`:642-674`)。
- **C16-20(Low)** 无每块 placeholder;`compact` 空 API(`:29,892`);命令面板不翻转方向(`:1177-1192`);rows 与 JS 高度双轨首帧闪动(`:936,567-571`);无撤销栈(textarea 销毁即失原生 undo,`block-ops.js:8-15`)。

与 Notion/Typora 的差距汇总:点击定位光标 / hover 反馈 / 所见即所得 / 类型转换 / 拖拽排序 / 跨块选择 / undo / 代码块高亮 / 表格编辑 / 图片处理 / 块间插入 / 每块占位 / 冲突合并,全部缺失或降级。

### D. 架构

- **D1(High)** 巨型文件:`note/[id]/+page.svelte` 1288 行(窗口尺寸持久化 4 条路径 + 层级策略 + 状态机 + 8 个命令包装 + CSS)、`BlockNoteContent.svelte` 1240 行(控制器+UI+补全+序列化+样式),合计占贴纸代码 43%。
- **D2(High)** 死代码:`note-editor-actions.js` 整文件 184 行无人 import(含图片粘贴);`insertBlockAfter`/`wrapMarkdownSelectionWithColor`/`registerNote*Command` 无调用;`.preview-text` 选择器指向不存在类;`preview-markdown`/`.task-add`/`compact`/`--note-inner-highlight-alpha` 均死。
- **D3(Med)** 样式复制漂移:两组 popover、danger 双份、markdown 渲染样式三处独立维护;`--ws-*` 双真源数值已分叉。
- **D4(Med)** 两套窗口拖拽实现并行(note/workspace),选择器清单漂移(见 B4)。
- **D5(Med)** 隐式几何耦合:NoteTagBar 38/42px 让位 control-exit、toolbarHeight+44 与 GAP 12 双套计算、`:global(.note-window[data-toolbar-visible])` 反向依赖父 DOM。
- **D6(Med)** 状态双真源:`text || note?.text`(清空可能回退旧文)、opacity/frost 草稿四处同步。
- **D7-9(Low)** 前端测试仅 1 个文件;i18n 漏网(`NoteTagsEditor.svelte:149,131,138` 等);`console.log("[note-layer]")` 残留(`+page.svelte:408-413`)与 12 处吞异常。

## 分期整改方案(建议)

- **S1 视觉统一(低风险,先做)**:抽公共 token 注入(A1,贴纸/mini 共用 → 解锁暗色 A3)、字体栈统一(A4)、圆角/阴影/间距接 token(A6)、图标统一 SVG(A5)、focus-visible 补齐(A8)、`type="button"`(A9)。
- **S2 编辑器手感核心**:C1 hover 态 + text cursor、C2 caretRangeFromPoint 光标映射、C3 编辑态镜像渲染态排版(标题字号/列表缩进/引用条)、C4 块间距与空行块最小高度、C16 每块 placeholder。
- **S3 数据正确性**:C5 冲突提示接线(+草稿保护)、C7 图片粘贴接线(顺带救活 note-editor-actions 或重写)、C20 应用层 undo(至少最近一次提交可撤销)、B3 渲染态可选中复制(与拖拽区重新划界)。
- **S4 内容渲染质量 + 清债**:C10/C11/C12 代码块/表格/图片样式与语言标记、C9 todo 追加按钮启用、C13 hr 可删、D2 死代码清理、渲染样式单一真源(D3)。
- **S5 工具栏与控制态重构（已按实测纠偏）**：B1 全部操作直接展示，不引入溢出菜单；B2 popover 锚定重写（复用 workspace 成熟实现）；B5 进入控制态时顶部控制区向上、底部工具栏向下扩窗，保持正文区域尺寸和屏幕坐标；B7 Esc 分层；B10 标签常显策略。
- **S6 编辑器架构升级(单独立项讨论)**:块类型菜单//命令、跨块选择、拖拽排序、D1 巨文件拆分、D4 拖拽实现合并、单测补齐(D7)。

## 2026-07-29 第一轮整改与交互纠偏记录

本轮已处理：

- B1 / B2 / B5：最终保留外扩窗口的原产品策略；退出/标签区向上扩展，工具栏向下扩展，全部操作直接展示且不使用更多菜单。宽窗单行、窄窗自然换行，双侧扩窗高度按各自实际高度计算。
- B3 / B4 / B6 / B7：撤回会覆盖整块正文的 `data-no-drag` 规则，恢复原贴纸表面拖动；表单控件、链接、编辑器、冲突提示和 popover 继续排除拖动。移除新增顶部拖拽柄；滚动条恢复为细轨；Esc 先关闭浮层。
- C1 / C2 / C3 / C4：移除第一版新增的活动块整框、6px 块间距和列表二次缩进；非活动内容坐标保持不变。标题编辑按 Markdown level 镜像渲染字号与行高；点击提供 best-effort Markdown caret 映射。
- C5：块编辑状态向路由同步；外部更新不覆盖活动草稿，显示冲突提示并由用户明确重新加载。
- C7：图片粘贴接入活动 textarea，复用后端 `save_clipboard_image`，失败时保留文字草稿并显示行内错误。
- D5 / D6 / D7：移除工具栏几何耦合；正文不再用 `text || note.text` 双真源；新增贴纸交互纯函数与前端测试入口。

交互纠偏原因：第一版把“向下扩窗 + 全操作直达”误判为需要消除的视觉负担，违背了正文坐标稳定和降低操作寻找成本两个产品目标，已按用户反馈撤回该取舍。

视觉证据：ordered-list 编辑前后 `top/left` 完全相同，高度仅差 `0.09px` 浏览器舍入；h1 编辑后后续列表仅移动 `0.20px`。288px 窄窗下 10 个工具按钮全部可见并向下换为两行。一次性预览路由验证后已删除。

第二轮纠偏：`data-no-drag` 曾被加入全局拖动拦截器，而块编辑器根节点整块携带该属性，导致贴纸正文几乎没有可拖区域；现已恢复原有拖动命中。退出与标签控件也从贴纸内部移到顶部外置区，原生窗口按“顶部向上、底部向下”扩展，持久化继续使用中间贴纸矩形坐标。

第三轮视觉收口：顶部标签区与底部工具栏不再绘制整宽面板，改为按内容收口的浮动控制轨；两侧以 180ms 外向位移、缩放和淡入呈现，正文矩形不参与动画。可拖表面显示 `grab`，拖动中显示 `grabbing`，交互控件继续保留各自光标。

第四轮浮岛化：移除顶部退出按钮、标签栏和底栏各自重复的面板材质，改为一体化顶部浮岛与四组单行底部浮岛；删除操作独立在最右侧。窗口几何由单轴扩展升级为左右/上下二维透明预留，展开、收起和拖动持久化都以正文矩形为唯一坐标真相。macOS `NSPanel` 显式关闭 opaque 与原生整窗阴影；控制态临时清除整窗原生磨砂，避免透明间隔被矩形 vibrancy/acrylic 重新填充，退出控制态后恢复。

外框回归根因修复：Tauri 2 的 `set_effects(None)` 只在 Windows 分支清理原生效果，macOS 分支不执行 `clear_vibrancy`，因此控制态仍残留覆盖整个扩展窗口的 `NSVisualEffectView`，并可能在反复调节磨砂后叠加。macOS 适配层现直接调用 `window-vibrancy`，在主线程循环删除全部残留效果视图；每次重新应用磨砂前也先清理，保证原生效果最多一层。

仍待处理：S1 的共享 token / 暗色、S4 内容渲染与死代码、S6 巨型文件拆分和高级编辑能力。真实 Tauri 窗口仍需人工回归中文输入法、窗口拖动、图片粘贴和外部更新冲突流程。
