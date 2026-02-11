# Workspace 创建栏回退：恢复单行与长文档独立入口

日期：2026-02-10  
范围：`workspace` 顶部创建栏

## 背景
- 之前将创建栏改为“快捷记录/长文档”双模式，并在长文档模式下使用多行输入；
- 实际体验上会导致顶部区域高度变化，主工作区发生跳动，不符合稳定操作预期。

## 本次调整
### 1) 恢复固定单行创建栏
- 移除创建模式切换（`快捷记录/长文档` tab）；
- 移除长文档多行输入形态；
- 顶部创建栏回到固定高度，保持布局稳定。

### 2) 恢复长文档独立入口行为
- 保留 `写长文档` 按钮；
- 点击后仍走原有“创建文档并进入详情编辑”的流程；
- 不再在顶部直接展开长文档输入区。

### 3) 清理不再使用的文案键
- 删除本次回退后无引用的键：
  - `workspaceCreateModeLabel`
  - `workspaceCreateModeQuick`
  - `workspaceCreateModeLong`
  - `workspaceLongDocHint`

## 涉及文件
- `src/lib/components/workspace/toolbar/WorkspaceCreateBar.svelte`
- `src/lib/strings.js`

## 验证
- 执行：`npx svelte-check --tsconfig ./jsconfig.json`
- 结果：`0 errors, 0 warnings`
