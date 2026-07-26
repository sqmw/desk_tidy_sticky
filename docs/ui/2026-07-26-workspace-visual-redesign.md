# 2026-07-26 Workspace 视觉重设计(第一轮)

状态:done(视觉层第一轮,范围限 workstation 窗口;贴纸窗口与 mini 面板未动)

背景:用户反馈 workstation 截图整体偏丑。基于 `2026-07-26-ui-design-audit.md` 的结论,本轮不做全量 token 迁移,而是先把 workstation 窗口的视觉层收敛成一套统一的设计语言,同时落地审计中与该窗口直接相关的结构 token。

## 设计语言

现代生产力工具风(参考 Linear / Things 的克制风格):

- 画布:安静的中性浅灰蓝渐变,弱化原先的多彩径向渐变;卡片纯白、侧栏半透明浅色。
- 强调色:light 预设由 `#1d4ed8` 调整为 `#2563eb`;激活态统一为「accent 浅染药丸 + accent 文字/图标」,去掉左侧 2px 指示条(统一 Modules 与 NoteFilters 两组导航的激活态,消audit M11)。
- 圆角:8 / 12 / 16 三档 token;阴影:sm / md / lg 三档 token,颜色走 `--ws-shadow-color`(各预设自带,dark/forest 用深色阴影)。
- 图标:侧栏导航与视图筛选全部配 1.7 描边线性 SVG 图标,尺寸 16px。

## 新增 token

`routes/workspace/+page.svelte` 的 `.workspace` 上定义(非预设控制的结构 token):

- `--ws-radius-sm: 8px` / `--ws-radius-md: 12px` / `--ws-radius-lg: 16px`
- `--ws-shadow-sm|md|lg`(基于 `--ws-shadow-color`)
- `--ws-focus-ring`(accent 16% 三像素环,所有新交互元素的 `:focus-visible` 统一用它)

`theme-presets.js` 每个预设新增 `--ws-shadow-color`,`buildWorkspaceThemeVarStyle` 为自定义主题补默认值(与 `--ws-accent-strong/soft` 同机制)。

## 分区改动

| 区域 | 文件 | 内容 |
|---|---|---|
| 根路由 | `src/routes/workspace/+page.svelte` | fallback token 与新 light 预设同步;新增结构 token;主区留白/间距调整;toolbar 尺寸 plumbing 适配新组件几何 |
| 主题预设 | `src/lib/workspace/theme/theme-presets.js` | light/dark 调色(canvas、卡片、边框、强调色);全预设补 `--ws-shadow-color` |
| 侧栏骨架 | `WorkspaceSidebar.svelte` | 品牌区改为「accent 渐变 logo 标记 + 标题 + hint」;底部两个开关改为真正的 switch 形态(带 `aria-pressed`);硬编码边框色 `#dbe4f2/#dce3ef` 换 token(audit M9)。修正(用户反馈):容器 ≤230px 时不再隐藏开关文字,改为 11px + 省略号截断;`.footer-toggle` 补 `min-width: 0`(grid item 默认 `min-width: auto` 会让开关被挤出侧栏右缘裁切),文字仅在 collapsed 图标态才隐藏 |
| 主导航 | `sidebar/WorkspaceSidebarModules.svelte` | 每个 tab 配图标(笔记/专注/回顾),圆角药丸激活态,collapsed 显示纯图标 |
| 视图筛选 | `sidebar/WorkspaceSidebarNoteFilters.svelte` | 五个视图配图标(全部/待办/四象限/归档/回收站),计数改右对齐 tabular-nums 裸数字,collapsed 显示纯图标 |
| 窗口栏 | `WorkspaceWindowBar.svelte` | 去掉橙色圆点,标题弱化为 muted 12px;按钮统一圆角+安静 hover(去 translateY),补 `:focus-visible` |
| 创建栏 | `toolbar/WorkspaceCreateBar.svelte` | 重构为一体化 composer 卡片(铅笔图标 + 无边框输入 + 标签编辑器 + 实心 accent 主按钮);focus-within 整卡亮环;dark 预设下主按钮自动切换为浅染变体保证对比度 |
| 搜索栏 | `toolbar/WorkspaceQueryBar.svelte` | 输入框内嵌放大镜图标,# 标签筛选钮 hover/active 统一 accent 浅染 |
| 笔记卡片 | `panel/workbench/WorkbenchNoteGrid.svelte` | 卡片改 14px 圆角纯白面 + shadow-sm,hover 上浮 + shadow-md;日期/优先级/标签移到底部 meta 行(日期右对齐);详情按钮悬浮右上;操作条毛玻璃浮层,按钮 ghost 化;新增列表空态(复用 `emptyActiveTitle` 等既有文案键);正文 line-clamp 4→5 |
| 标签栏 | `WorkspaceTagFilterRail.svelte` | 行样式与侧栏对齐(圆角、accent 激活、裸数字计数),补 `:focus-visible` |
| 详情抽屉 | `WorkspaceNoteInspector.svelte` + `WorkspaceNotesPane.svelte` | 用户确认后由分栏改为 side-peek 浮层:inspector 改为挂在 `workbench-shell` 上的绝对定位抽屉卡片(`clamp(340px, --inspector-width, 100%-56px)`、圆角 16、`shadow-lg`、毛玻璃底),打开/切换不再重排网格;`fly` 出入场动效(`prefers-reduced-motion` 降为 0ms);头部改为「日期 meta + × 图标关闭」,清理名不副实的 `.btn.danger` 与暗色橙红 hover(audit M10);拖宽把手移到抽屉左缘,复用原 `calcInspectorLayout` 状态机(含左缘 ≤56px 拖至全宽的 collapsed 态,对应 `.inspector.expanded`);shell 删除 inspector 相关网格列与 splitter,仅保留标签栏列 |

## 明确不动的部分

- 贴纸窗口(`routes/note/[id]`)与其共享组件(`NoteTagsEditor` 等):用户要求本轮不动。
- mini 面板(`routes/+page.svelte`):`WorkbenchSection`/`WorkbenchNoteGrid` 仅 workstation 引用,已确认不外溢。
- Focus / Review 两个 hub 的内部布局:仅通过预设调色间接受益,组件级收敛留给 Phase 2。

## 验证

- `pnpm check`(svelte-check)0 errors / 0 warnings;`pnpm build` 通过。
- 浏览器(无 Tauri 后端)目检 1360×860:侧栏图标导航、composer、搜索、空态、底部 switch、dark 主题切换均正常。注:浏览器窗格早期较窄时观察到侧栏宽度被 `recommendedSidebarWidth` 钳制后不随视口变宽恢复(棘轮效应),为既有布局器行为,真实桌面窗口尺寸下不触发,未在本轮修改。
- 详情抽屉:因浏览器环境无笔记数据,用临时 dev 路由 + fixture 目检(验证后已删除):浮层悬于网格之上、网格零重排、关闭 outro 正常。拖宽/全宽折叠依赖真实状态机,待真实运行回归。
- 待人工回归(需真实 Tauri 运行):带数据的卡片网格、四象限视图、抽屉打开/切换笔记/拖宽/左缘拖至全宽、五套主题预设逐一切换。

## 后续(回写主 TODO)

1. Phase 1 全量 token 迁移(mini 面板与贴纸窗口共享注入)仍未开始,本轮结构 token 只挂在 workstation 根上。
2. 四象限板 `WorkbenchQuadrantBoard` 与 Focus/Review hub 未按新卡片语言收敛。
3. 布局器 sidebar 宽度棘轮效应(窗口变窄再变宽后侧栏不恢复)可在 Phase 4 处理。
4. 抽屉查看态不显示标签/优先级(`NoteTagBar` 仅在编辑/控制态渲染,既有行为):候选改进是抽屉头部下方常显只读标签行。
