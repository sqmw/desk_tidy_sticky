# Workspace 新建入口双通道（快记 + 长文档）

## 背景
- 顶部单行输入适合快速捕捉，但不适合长文档创作。
- 需要兼顾“快速记录效率”和“深度编辑入口”。

## 方案
- 保留原有 `新建笔记`（单行快记）。
- 新增 `写长文档` 按钮：
  - 一键创建新笔记；
  - 自动打开完整编辑窗口（`/note/[id]`）进入深度编辑。

## 实现要点

### 1. 文案扩展
- `src/lib/strings.js`
  - 新增：`workspaceCreateLongDoc`
    - en: `Long document`
    - zh: `写长文档`

### 2. UI 结构
- `src/lib/components/workspace/toolbar/WorkspaceCreateBar.svelte`
  - 创建区改为双按钮：
    - 主按钮：`新建笔记`
    - 次按钮：`写长文档`

### 3. 业务逻辑
- `src/routes/workspace/+page.svelte`
  - 新增 `createLongDocument()`：
    - 基于输入文本创建笔记（为空时用标题模板）；
    - 识别新创建的笔记；
    - 调用 `windowSync.openNoteWindow(created)` 打开完整编辑窗口；
    - 清空输入框并回到笔记主 tab（若当前不在笔记 tab）。

## 影响文件
- `src/lib/strings.js`
- `src/lib/components/workspace/WorkspaceToolbar.svelte`
- `src/lib/components/workspace/toolbar/WorkspaceCreateBar.svelte`
- `src/routes/workspace/+page.svelte`

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`
