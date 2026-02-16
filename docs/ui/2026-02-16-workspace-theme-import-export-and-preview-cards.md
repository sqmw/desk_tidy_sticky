# Workspace 主题二期：预览卡片 + JSON 导入导出

## 本次目标
- 在已有“内置主题 + 自定义 CSS”基础上，补齐主题可迁移能力和可视化选择体验。
- 具体交付：
  - 主题预设从下拉改为预览卡片选择。
  - 支持导出主题 JSON。
  - 支持导入主题 JSON 并立即生效。

## 改动点

### 1) 新增主题 IO 模块（避免页面内堆逻辑）
- 文件：`src/lib/workspace/theme/theme-bundle.js`
- 职责：
  - `createWorkspaceThemeBundle`：生成标准化导出对象。
  - `parseWorkspaceThemeBundle`：解析导入 JSON，归一化 `themePreset` 与 `customCss`。

### 2) 自定义 CSS 归一化独立模块
- 文件：`src/lib/workspace/theme/theme-custom-css.js`
- 职责：
  - 统一 `customCss` 长度限制和归一化策略。
  - 被偏好服务与主题导入共同复用，避免双处实现漂移。

### 3) 预设卡片化 UI
- 文件：`src/lib/components/workspace/WorkspaceSettingsDialog.svelte`
- 变化：
  - 移除主题下拉式选择，改为缩略预览卡片。
  - 卡片包含名称、基础配色预览、激活态边框。
  - 小屏下自动单列展示。

### 4) 导入导出交互
- 文件：`src/lib/components/workspace/WorkspaceSettingsDialog.svelte`
- 文件：`src/routes/workspace/+page.svelte`
- 交互：
  - 导出：一键下载 `desk-tidy-workspace-theme-*.json`。
  - 导入：选择 `.json` 文件后校验并应用。
  - 应用成功/失败都给出即时状态提示。

## 数据格式（导出 JSON）
```json
{
  "type": "desk-tidy-workspace-theme",
  "version": 1,
  "exportedAt": "2026-02-16T12:34:56.000Z",
  "themePreset": "forest",
  "customCss": ".workspace { --ws-accent: #22c55e; }"
}
```

## 兼容策略
- 导入解析支持历史字段名兜底：
  - `themePreset` / `workspaceTheme` / `preset`
  - `customCss` / `workspaceCustomCss`
- 无效 JSON 或结构异常时，拒绝导入并显示错误提示，不污染当前主题状态。

## 验证
- `npm run check`：通过（0 error / 0 warning）
- `cargo check`：通过（仅历史 warning）

