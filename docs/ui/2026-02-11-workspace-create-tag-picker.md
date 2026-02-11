# Workspace 顶部创建区标签“选择器”增强（2026-02-11）

## 背景

顶部创建区原本只支持“输入标签”，当已有标签较多时，重复输入成本高、易输错。

## 改动

在顶部创建区改为“输入即选择”的统一标签输入器：

1. 输入框聚焦时可展示当前视图已存在标签建议。
2. 点击建议标签可直接加入当前新建笔记标签。
3. 继续支持直接输入并回车创建新标签。

## 交互规则

1. 输入框支持“输入新标签 + 选择已有标签”合并交互。
2. 回车/逗号创建新标签，点击建议快速复用已有标签。
3. 若已存在同名标签（忽略大小写），不会重复添加。

## 涉及文件

- `src/lib/components/note/NoteTagsEditor.svelte`
- `src/lib/components/workspace/toolbar/WorkspaceCreateBar.svelte`
- `src/lib/components/workspace/WorkspaceToolbar.svelte`
- `src/routes/workspace/+page.svelte`
