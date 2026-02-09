# 贴纸完成状态图标修复（2026-02-09）

## 问题
贴纸工具栏“完成/未完成”按钮始终显示已完成（勾选）图标，无法反映真实状态。

## 根因
`NoteToolbar` 中该按钮图标被写死为勾选图标，未根据 `note.isDone` 做条件渲染。

## 修复
- 文件：`src/lib/components/note/NoteToolbar.svelte`
- 按钮图标改为条件分支：
  - `note.isDone === true` 显示勾选圆形图标
  - `note.isDone === false` 显示空心圆图标
- 保持原有点击逻辑与 title 文案不变。

## 验证
- 切换完成状态后，图标可在“空心圆/勾选圆”之间正确切换。
