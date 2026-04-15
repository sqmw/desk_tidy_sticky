# Workspace 主题二期：预览卡片 + CSS 导入导出

## 收敛结论
- 自定义主题区域的核心对象是 `CSS`，不是 JSON 主题包。
- 当前 UI 已调整为：
  - `导出主题`：仅导出 `workspaceCustomCss`（CSS 文本）。
  - `导入主题`：仅导入并应用 `workspaceCustomCss`（CSS 文本）。
  - `复制完整模板`：复制全量变量 + 模块默认样式 + 组件选择器索引。

## 本次调整范围
- `src/lib/components/workspace/WorkspaceSettingsDialog.svelte`
  - 文案与按钮改为 CSS 语义。
  - 文件选择器限制为 `.css`（兼容 text/plain）。
- `src/routes/workspace/+page.svelte`
  - 移除页面中的 JSON 主题包导入导出流程。
  - 新增/替换为 `exportWorkspaceThemeCss`、`importWorkspaceThemeCss`。
  - 导出文件名：`desk-tidy-workspace-theme-<preset>-<timestamp>.css`。
- `src/lib/strings.js`
  - 中英文文案改为 `Import theme / Export theme`、`导入主题 / 导出主题`。

## 交互定义
### 导出主题（CSS）
- 导出当前自定义主题文本。
- 若当前为空，导出一个注释模板，提示先复制完整模板再编辑。

### 导入主题（CSS）
- 读取 CSS 文件内容后做归一化处理。
- 空内容判定为无效并给出错误提示。
- 成功后实时生效并持久化到 `workspaceCustomCss`。

### 复制完整模板
- 用于“从 0 到 1”搭建自定义主题。
- 模板内容：
  - 主题变量（`--ws-*`）完整清单。
  - 工作台主要模块默认样式。
  - 工作台组件类名选择器索引。

## 为什么不在这里放 JSON
- 从用户心智看，“自定义主题”就是编辑 CSS。
- JSON 更像“主题包交换格式”，放在这个入口会造成概念混淆。
- 若后续要做主题市场/云同步，可在独立“主题管理”入口提供 JSON 包导入导出，不与 CSS 编辑混排。

## 验证
- `npm run check`：通过（0 error / 0 warning）
- `cargo check`：通过（仅历史 warning）

## 2026-04-15 补充：设置弹窗主题透传修复

### 判定
- 类型：`Bug/回归`

### 问题
- 工作台主界面已经应用主题预设和自定义 `workspaceCustomCss`；
- 但设置弹窗在 DOM 层级上挂在 `workspace` 容器外，导致原本依赖继承的 `--ws-*` token 不生效，回退成浅色默认样式。

### 调整
- `src/routes/workspace/+page.svelte`
  - 将 `workspaceThemeDark` 与 `workspaceThemeVarStyle` 传入 `WorkspaceSettingsDialog`。
- `src/lib/components/workspace/WorkspaceSettingsDialog.svelte`
  - 在 backdrop 根节点显式应用主题变量；
  - 增加 `theme-dark` 状态，保证弹窗内部各 section 与 workspace 主界面使用同一套 token。

### 结果
- 设置弹窗与工作台主题保持一致；
- 自定义主题 CSS 不再只对主界面生效，弹窗也能同步看到结果。

## 2026-04-15 补充：完整模板变量覆盖校准

### 判定
- 类型：`Bug/回归`

### 问题
- 项目中实际使用到的主题 token 包含 `--ws-accent-soft` / `--ws-accent-strong`，但旧模板未列出，容易导致主题覆盖不完整。
- 旧模板变量只写在 `.workspace` 上，但设置弹窗渲染在 `.workspace` 外，导致“改变量”无法覆盖弹窗。

### 修复
- `src/lib/workspace/theme/theme-default-template-config.js`
  - `THEME_TOKEN_ORDER` 补齐 `--ws-accent-strong`、`--ws-accent-soft`。
- `src/lib/workspace/theme/theme-default-template-sections.js`
  - 变量根选择器改为 `:where(.workspace, .settings-backdrop)`，让设置弹窗也吃到同一套 token；
  - 模板变量行统一带 `!important`，避免被 preset 的内联变量覆盖；
  - 设置弹窗相关默认样式与选择器索引不再强依赖 `.workspace` 前缀；
  - 运行时内部变量（`--ws-ui-scale` 等）仅以注释形式列出，不建议在主题里覆盖，防止缩放/过渡逻辑被破坏。
- `src/lib/workspace/theme/theme-presets.js`
  - `buildWorkspaceThemeVarStyle` 补齐衍生 token，保证所有 preset 下都有稳定值。

## 2026-03-30 补充：设置弹窗排版重构

### 判定
- 类型：`设计收敛`

### 问题
- 原设置弹窗宽度偏窄，主题预设卡、自定义主题按钮组和下方通用设置被强行压在单列里，信息层级不清晰，滚动后观感凌乱。

### 调整
- `src/lib/components/workspace/WorkspaceSettingsDialog.svelte`
  - 弹窗改为更宽的桌面布局，并增加内部滚动区。
  - 内容分为三段：
    - 基础设置
    - 主题设置
    - 显示设置
  - 主题预设卡片保持网格布局，但按钮区改为自适应网格，不再挤成一排。
  - 自定义主题编辑器拉高，并与主题操作按钮、状态提示形成稳定上下结构。
  - 底部缩放/字体/侧栏布局改为两列响应式布局，小屏自动收成单列。

### 结果
- 设置弹窗的阅读顺序更清楚，主题区不再显得拥挤。
- 大屏下空间利用更充分，小屏下也能自然折叠。

## 2026-03-30 补充：工作台设置补齐开机启动入口

### 判定
- 类型：`Bug/能力缺失`

### 问题
- 简洁模式设置面板已经提供：
  - `开机自启`
  - `启动时显示主窗口`
- 工作台模式的 `WorkspaceSettingsDialog` 缺少同一组入口，导致两种模式能力不一致，用户只能切回简洁模式配置启动行为。

### 调整
- `src/routes/workspace/+page.svelte`
  - 直接复用 `@tauri-apps/plugin-autostart`，新增：
    - `initAutostart()`
    - `toggleAutostart(enabled)`
  - 工作台启动时同步读取当前自启状态。
  - 将 `showPanelOnStartup` 从 `loadWorkspacePreferences` 返回值接回工作台路由状态。
- `src/lib/workspace/preferences-service.js`
  - `loadWorkspacePreferences` 补充返回 `showPanelOnStartup`，避免工作台路由绕过统一偏好加载层。
- `src/lib/components/workspace/WorkspaceSettingsDialog.svelte`
  - 新增“常规”区块下的两条启动行为开关：
    - `开机自启`
    - `启动时显示主窗口`
  - 工作台设置与简洁模式共用同一份持久化和同一套平台实现。

### 平台说明
- Win 和 macOS 都走现有的 Tauri autostart 插件能力，不新增额外平台分叉逻辑。
- `启动时显示主窗口` 继续使用已有偏好字段 `show_panel_on_startup`，由后端启动流程统一读取。

### 验证
- `pnpm check`：待本轮代码验证

## 2026-03-30 补充：启动设置跨模式同步

### 判定
- 类型：`Bug/状态同步缺失`

### 根因
- 简洁模式与工作台模式虽然都能修改：
  - `show_panel_on_startup`
  - autostart 插件状态
- 但两边此前只更新各自本地 `state`，没有在设置写入后广播“偏好已变化”，所以另一个窗口不会立即刷新开关状态。

### 调整
- 新增 `src/lib/preferences/preferences-sync.js`
  - 统一封装 `preferences_changed` 事件的广播与监听。
- `src/lib/preferences/preferences-store.js`
  - 任意偏好落盘后自动广播本次更新字段。
- `src/routes/+page.svelte`
  - 监听偏好变更事件，同步刷新 `showPanelOnStartup` / `isAutostartEnabled`。
  - 切换 autostart 后主动广播 `autostartEnabled`。
- `src/routes/workspace/+page.svelte`
  - 同步监听同一事件，保持工作台设置状态与简洁模式实时一致。

### 结果
- 简洁模式和工作台模式的启动设置现在共享同一份配置，并且切换任一窗口里的开关后，另一窗口会立即同步状态。
