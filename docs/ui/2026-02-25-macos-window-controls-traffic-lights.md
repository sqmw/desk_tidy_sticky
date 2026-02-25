# macOS 窗口按钮样式对齐（Traffic Lights，2026-02-25）

## 目标
- 将当前面板/工作台窗口按钮从 Windows 风格（`- □ ×`）调整为 macOS 常见交通灯风格（红黄绿圆点，左上角）。
- 工作台绿灯改为 macOS 语义的“全屏切换”，不是普通窗口最大化。

## 变更点
1. 工作台窗口栏按钮样式
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceWindowBar.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceMacTrafficLights.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/workspace/+page.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/controllers/workspace-runtime-lifecycle.js`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/capabilities/default.json`
- 在 macOS 运行时检测成立时：
  - 交通灯按钮从 `WorkspaceWindowBar` 中拆出，挂到 `workspace-viewport` 顶层；
  - 锚定到整个 workspace 窗口左上角（不随右侧内容区起点偏移）；
  - 三个按钮使用红（关闭）/黄（最小化）/绿（全屏）圆点；
  - 使用独立 `mac-traffic-btn` 样式（不复用原 `bar-btn`），避免出现纵向胶囊形态；
  - 将 `× / − / +` 文字替换为矢量 glyph，尺寸和线宽上调，避免图标过小；
  - 绿灯 glyph 改为全屏进出形态，不再显示 `+`。

2. macOS 绿灯行为改为 fullscreen
- `toggleWindowMaximize` 在 macOS 分支改为：
  - `isFullscreen()` + `setFullscreen(!current)`；
  - 不再走 `toggleMaximize()`。
- `windowMaximized` 状态在 macOS 下改为同步 fullscreen 状态（`isFullscreen`），用于绿灯图标切换。
- `default` capability 补充：
  - `core:window:allow-is-fullscreen`
  - `core:window:allow-set-fullscreen`

3. 交通灯 glyph 可见性与居中修正
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceMacTrafficLights.svelte`
- 将 `× / − / 绿灯符号` 统一改为 `12x12` 对称路径，消除视觉偏移；
- glyph 容器改为 `inline-flex + center`，并设置为默认可见（高对比）；
- 绿灯图标对齐 AppKit `zoomButton` 语义，调整为标准 `+` 形态。
- 对齐系统观感：交通灯尺寸降到 `12px`、间距 `6px`、线宽收窄，符号重心居中（避免粗重/“塑料感”）。

4. 全屏态隐藏自定义交通灯
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/workspace/+page.svelte`
- macOS 进入全屏后，不再渲染自定义交通灯（避免遮挡内容）；
- 全屏态使用系统原生窗口控制显示逻辑，退出全屏后恢复自定义交通灯。
- 非全屏态不做整页下移；交通灯直接占用左侧 `WORKSPACE` 标签行，避免新增顶部空白。
- 显示交通灯时保留 `WORKSPACE` 标签行的占位（文字隐藏），保证下方中文标题与描述不被上移遮挡。
- macOS 全屏态下不再显示 `WORKSPACE` 英文标签（隐藏而非恢复显示），避免状态切换时闪回。
- 交通灯 glyph 做统一微偏移校正（右下 `0.24px`），修复三按钮符号视觉偏左上。

5. 紧凑面板头部按钮样式
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/panel/HeaderActions.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/panel/PanelHeader.svelte`
- 在 macOS 运行时检测成立时：
  - 将红/黄窗口按钮放到标题栏左上角（应用名左侧）；
  - `HeaderActions` 右侧仅保留功能按钮，不再重复渲染窗口控制；
  - 行为仍绑定现有 `hideWindow` / `minimizeWindow`。

## 行为保证
- macOS 工作台：
  - 红灯：隐藏窗口（保持原逻辑）
  - 黄灯：最小化（保持原逻辑）
  - 绿灯：系统全屏切换（改为 mac 语义）
- 非 macOS 平台继续使用原有按钮样式。
