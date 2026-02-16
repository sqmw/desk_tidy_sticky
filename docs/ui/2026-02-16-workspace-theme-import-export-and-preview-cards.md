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
