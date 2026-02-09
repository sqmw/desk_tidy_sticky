# Workspace 主题切换动画与形状选择（2026-02-09）

## 需求
1. 主题切换动画需要更优雅（圆形覆盖或爱心形状）；
2. 支持右键选择动画形式；
3. 在实现功能的同时，降低页面耦合，改善结构清晰度。

## 实现概览

### 1) 主题切换动效（圆形/爱心）
- 新增组件：`src/lib/components/workspace/WorkspaceThemeTransition.svelte`
- 动画策略：
  - `circle`：基于 `clip-path: circle(...)` 的扩散覆盖动画；
  - `heart`：基于心形 `clip-path` + `scale` 放大覆盖动画。
- 触发方式：点击顶部主题按钮时，以按钮中心作为扩散起点。

### 2) 右键选择形状
- 在顶部主题按钮加入 `contextmenu` 交互：
  - 右键弹出形状菜单（圆形扩散 / 爱心扩散）；
  - 选择后即时生效并持久化。
- 对应组件：`src/lib/components/workspace/WorkspaceWindowBar.svelte`

### 3) 偏好持久化
- 新增前端偏好字段：`workspaceThemeTransitionShape`
- 读取：workspace 页面初始化时从 `get_preferences` 读取；
- 保存：选择形状后通过 `set_preferences` 写回。

## 结构整理（面向 90 分目标的拆分）

### 拆分点 1：布局尺寸计算逻辑抽离
- 新增：`src/lib/workspace/layout-resize.js`
- 抽离函数：
  - `calcSidebarWidth`
  - `calcInspectorLayout`
- 目的：从 `src/routes/workspace/+page.svelte` 移除重复的分栏边界计算，减少页面职责。

### 拆分点 2：主题转场 UI 抽离
- 新增独立组件承载动画渲染：`WorkspaceThemeTransition.svelte`
- 目的：避免在页面中夹杂大量动画 CSS 与状态细节。

## 影响文件
- `src/routes/workspace/+page.svelte`
- `src/lib/components/workspace/WorkspaceWindowBar.svelte`
- `src/lib/components/workspace/WorkspaceThemeTransition.svelte` (新增)
- `src/lib/workspace/layout-resize.js` (新增)
- `src/lib/strings.js`

## 验证
- 左键主题按钮：可看到形状扩散动画并完成主题切换；
- 右键主题按钮：可切换动画形状；
- 形状选择重启后仍保持；
- `npm run check` 与 `cargo check` 通过。

## 主题切换动画重设计（B 站式左下扩散）
- 问题：原实现“先切主题再动画”，导致视觉上几乎无覆盖效果。
- 修复：
  1. 动画起点固定到左下角（`x=26, y=windowHeight-26`）；
  2. 先播放覆盖动画，动画结束后再应用主题类；
  3. 延长时长到 `760ms`，缓动改为更平滑曲线；
  4. 快速连续点击时会清理上次定时器，避免状态冲突。
- 同步调整：
  - 圆形与爱心扩散动画时长统一为 760ms；
  - 爱心扩散终值 scale 提升到 120，保证完整覆盖。
- 结果：切换更接近“左下逐渐扩散覆盖全屏”的视觉效果。

## 修复：圆形扩散切主题白/黑闪
- 问题：圆形扩散结束时出现白/黑闪，属于切主题与撤覆盖层时机重叠导致的露底色。
- 修复策略：两段时序 + 覆盖层淡出
  1. 动画先跑到接近结束（700ms）再切换主题；
  2. 覆盖层延迟到 760ms 再撤；
  3. 覆盖层常驻 DOM，通过 `opacity` 过渡显示/隐藏，避免卸载瞬间闪屏。
- 结果：切换更平滑，无明显白/黑闪。

## 修复：圆形扩散偶发整屏黑/白闪
- 现象：`circle` 形状切换时，偶发整屏黑/白闪；`heart` 正常。
- 根因推断：`clip-path` 圆形扩散在 WebView2 下存在偶发渲染抖动。
- 修复：
  1. 圆形动画从 `clip-path` 改为“超大圆层 `scale` 扩散”；
  2. 覆盖层保持透明容器，仅由动画层扩散覆盖；
  3. 爱心形状保留原有路径扩散实现。
- 结果：圆形扩散稳定性显著提升，不再出现整屏闪烁。

## 再修复：切换中出现“纯色块遮住内容”
- 用户反馈：切换过程里出现大块纯色区域（黑/白），而不是新旧主题都显示真实页面内容。
- 根因：
  1. 纯色覆盖层方案天然会遮挡真实内容；
  2. `root` 级 View Transition 与页面自定义动画叠加时，可能出现默认过渡层干扰。
- 最终方案（2026-02-09 晚）：
  1. 废弃纯色覆盖组件 `WorkspaceThemeTransition.svelte`；
  2. 改为基于 `View Transition` 的真实快照动画；
  3. 过渡目标从 `root` 切到 `workspace-root`（`view-transition-name: workspace-root`）；
  4. 显式关闭 `root` 默认过渡层，仅保留 `workspace-root` 的圆形/爱心扩散动画。
- 结果：
  1. 动画过程中两侧都显示真实 UI 内容；
  2. 不再出现整块纯色遮挡的视觉问题；
  3. 右键形状选择能力保持不变。

## 本次影响文件（增量）
- `src/routes/workspace/+page.svelte`（过渡目标改为 `workspace-root`，屏蔽 `root` 默认过渡）
- `src/lib/components/workspace/WorkspaceThemeTransition.svelte`（删除，避免重复路径）

## 修复：圆形/爱心动画误用同一路径
- 问题：用户反馈圆形和爱心看起来是同一个动画。
- 根因：`heart` 选择器误复用了圆形 `clip-path: circle(...)` 动画。
- 修复：
  1. `circle` 保持圆形扩散；
  2. `heart` 改为独立心形多边形扩散（`clip-path: polygon(...)`）；
  3. 新增 `@property --ws-heart-size` 与 `ws-vt-heart-in`，心形独立时序（带轻微回弹）。
- 结果：两种主题切换形状视觉可明显区分。
