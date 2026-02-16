# Workspace 主题系统升级：内置主题 + 自定义 CSS

## 背景
- 之前工作台仅支持浅色/深色二选一，无法满足用户对品牌感和个性化配色的需求。
- 目标是提供两层能力：
  - 开箱即用：内置多个可选主题。
  - 深度定制：用户可直接编写 CSS 覆盖样式。

## 本次改动范围
- 新增主题预设模块：`src/lib/workspace/theme/theme-presets.js`
- 偏好读写扩展：`src/lib/workspace/preferences-service.js`
- 页面应用链路：`src/routes/workspace/+page.svelte`
- 设置面板扩展：`src/lib/components/workspace/WorkspaceSettingsDialog.svelte`
- 偏好持久化字段：`src-tauri/src/preferences.rs`
- 文案扩展：`src/lib/strings.js`

## 设计与实现
### 1) 主题预设模块化（单一职责）
- 将主题 token 从页面中抽离到 `theme-presets.js`，避免 `+page.svelte` 持续膨胀。
- 每个主题包含：
  - `id`
  - `appearance`（`light` / `dark`）
  - `labelKey`（国际化文案 key）
  - `vars`（CSS 变量集合）
- 内置主题：
  - `light`
  - `dark`
  - `paper`
  - `forest`
  - `sunset`

### 2) 自定义 CSS（用户编写）
- 新增偏好字段 `workspaceCustomCss`（Rust 字段：`workspace_custom_css`）。
- 设置面板新增 CSS 编辑区，输入后即时应用，并自动保存（防抖写入）。
- 清空按钮一键恢复默认样式。

### 3) 页面渲染策略
- 主题预设通过根容器内联变量应用（`style` 注入 CSS variables）。
- 用户自定义 CSS 通过 `<svelte:head><style>...</style></svelte:head>` 注入。
- 保留 `theme-dark` 语义类，用于兼容旧样式分支与深色逻辑。

### 4) 兼容策略
- 保持 `workspaceTheme` 字段继续可用，但语义从“浅/深”扩展为“主题 preset id”。
- 旧用户数据（仅 `light/dark`）不需要迁移脚本，可直接兼容。

## 交互说明
- 顶栏月亮/太阳按钮：快速在 `light` 与 `dark` 间切换（快速模式）。
- 设置面板：
  - 主题预设下拉：切换到任一内置主题。
  - 自定义 CSS：按需覆盖任何选择器（建议以 `.workspace` 作用域起手）。

## 验证
- 前端：`npm run check` 通过（0 error / 0 warning）。
- 后端：`cargo check` 通过（存在历史 `dead_code` warning，本次未新增编译错误）。

## 说明
- 本次先落地“预设 + 自定义 CSS”能力，不涉及“主题包导入/导出”与“在线主题市场”。
- 后续可在当前结构上继续加：
  - 主题预览缩略图
  - 主题 JSON 导入导出
  - 自定义 CSS 语法校验/格式化

## 后续补充
- 已在下一轮补齐：`docs/ui/2026-02-16-workspace-theme-import-export-and-preview-cards.md`
