# Workspace 顶部工具栏拆分（Create / Query）

## 目标
- 解决“工作台顶部仍像便笺保存条”的语义问题。
- 将工具栏改为“创建入口 + 检索入口”两段式，符合工作台用户习惯。

## 本次调整

### 1. 组件拆分
- 新增：
  - `src/lib/components/workspace/toolbar/WorkspaceCreateBar.svelte`
  - `src/lib/components/workspace/toolbar/WorkspaceQueryBar.svelte`
- 重构：
  - `src/lib/components/workspace/WorkspaceToolbar.svelte`
  - 只保留布局编排，不再混合新建、搜索、排序细节。

### 2. 交互语义升级
- 工作台按钮文案更新为“新建笔记”：
  - `workspaceCreateNote`
    - en: `New note`
    - zh: `新建笔记`
- 输入占位语义保持“快速新建笔记（回车创建）”。

### 3. 布局优化
- 工具栏采用双列结构：
  - 左：Create（输入 + 新建按钮）
  - 右：Query（搜索 + 排序）
- 小屏继续降级为单列，保证响应式可用。

## 架构收益
- 单一职责更清晰：
  - `WorkspaceToolbar`: layout shell
  - `WorkspaceCreateBar`: create intent
  - `WorkspaceQueryBar`: search/sort intent
- 便于后续独立演进（如新增快捷创建模板、搜索过滤条件）。

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`
