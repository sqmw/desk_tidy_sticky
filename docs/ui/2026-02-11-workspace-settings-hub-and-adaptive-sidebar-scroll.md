# Workspace 设置入口与侧栏滚动优化

## 目标
- 解决侧栏「视图」区域出现局部滚动条、信息可见性差的问题。
- 将工作台的全局设置集中到统一设置弹窗，避免侧栏设置区过载。
- 提升「显示缩放=自适应」在不同分辨率和 DPI 下的稳定性。

## 调整内容
### 1. 侧栏滚动策略改造
- `WorkspaceSidebar.svelte` 改为「整栏滚动」：
  - `overflow-y: auto` 放在 `.sidebar` 根容器。
  - 增加统一滚动条样式，和工作台主题变量对齐。
- `note-filters-block` 从 `flex: 1 1 auto` 改为 `flex: 0 0 auto`：
  - 不再强制占满可用高度，避免「视图」块内部被挤压后出现不必要滚动。

### 2. 设置入口统一
- 新增 `WorkspaceSettingsDialog.svelte`，用于承载全局设置：
  - 语言
  - 显示缩放（含自适应）
  - 字体大小（应用级 UI 字号）
- 侧栏保留高频快捷开关：
  - 桌面贴纸显示/关闭
  - 贴纸鼠标交互开关
- 通过 `WorkspaceWindowBar.svelte` 增加设置按钮进入弹窗。

## 2026-04-15 补充：设置弹窗接入工作台主题

### 判定
- 类型：`Bug/回归`

### 根因
- `WorkspaceSettingsDialog.svelte` 已经使用 `--ws-*` 主题变量；
- 但弹窗挂在 `workspace` 根容器外部渲染，无法自然继承 `workspace/+page.svelte` 上的主题变量和 `theme-dark` 状态；
- 因此会退回到默认浅色 fallback，表现成“纯白弹窗”。

### 修复
- `src/routes/workspace/+page.svelte`
  - 显式把 `workspaceThemeDark` 与 `workspaceThemeVarStyle` 传给 `WorkspaceSettingsDialog`。
- `src/lib/components/workspace/WorkspaceSettingsDialog.svelte`
  - 弹窗 backdrop 根节点接收 `themeDark` 与 `themeVarStyle`；
  - 在弹窗自身建立一层 `--ws-*` fallback，保证即使脱离 workspace 容器也能正确取色；
  - 暗色主题通过 `theme-dark` class 切换到与 workspace 一致的 token 组。

### 结果
- 设置弹窗现在会跟随工作台主题切换；
- 浅色/深色/自定义主题都能保持一致，不再出现主界面有主题、弹窗却是纯白的割裂感。

### 3. 自适应缩放算法升级
- `src/routes/workspace/+page.svelte` 中 `workspaceAdaptiveScale` 从简单长短边比，改为基于：
  - 视口宽高
  - 当前侧栏宽度（预留主内容区）
  - 当前 DPI（`devicePixelRatio` 补偿）
  - 侧栏折叠状态补偿
- 目标是让高分辨率和缩放场景下，布局与控件尺寸更稳定，不出现明显挤压。

## 影响范围
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
- `src/lib/components/workspace/WorkspaceWindowBar.svelte`
- `src/lib/components/workspace/WorkspaceSettingsDialog.svelte`（新增）
- `src/routes/workspace/+page.svelte`

## 验证建议
- 在 100% / 125% / 140% 缩放下检查：
  - 侧栏「导航/视图/设置」是否仍可完整访问。
  - 「视图」卡片是否不再出现局部滚动条干扰。
  - 设置弹窗中的语言/缩放/字体大小修改是否即时生效并持久化。
