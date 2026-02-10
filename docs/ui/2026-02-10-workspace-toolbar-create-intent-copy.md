# 工作台顶部输入区文案与动作语义优化

## 背景
- 进入工作台后，顶部输入区仍使用“便笺/保存”语义，容易让用户误解为“编辑保存当前内容”，而非“创建新笔记入口”。

## 调整内容

### 1. 输入框语义改为创建
- `workspaceQuickNoteHint`
  - 英文：`Quick capture note (optional)` -> `Quick create note (press Enter)`
  - 中文：`快速便笺（可选）` -> `快速新建笔记（回车创建）`

### 2. 按钮语义改为创建
- 新增文案键：`workspaceCreateNote`
  - 英文：`Create`
  - 中文：`新建`
- 工作台顶部按钮优先显示 `workspaceCreateNote`，不再显示通用 `saveNote`。

### 3. 轻量样式微调
- 顶部创建按钮增加最小宽度，避免文本拥挤，维持一致性。

## 影响文件
- `src/lib/strings.js`
- `src/lib/components/workspace/WorkspaceToolbar.svelte`

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`
