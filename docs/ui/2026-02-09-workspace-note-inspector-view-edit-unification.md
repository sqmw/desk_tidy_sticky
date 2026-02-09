# Workspace 查看/编辑统一面板（2026-02-09）

## 背景
原 workstation 点击编辑会弹出小型 `EditDialog`。该交互适合简洁模式，不适合工作台的高信息密度场景。

## 本次方案
1. 引入工作台右侧详情面板（同一容器内统一“查看/编辑”）：
   - 查看态：渲染 markdown 内容与更新时间。
   - 编辑态：文本编辑 + `Ctrl/Cmd+Enter` 保存 + `Esc` 取消。
2. 卡片交互统一：
   - 双击卡片：打开“查看态”。
   - 点击卡片编辑按钮：直接进入“编辑态”。
3. 移除 workstation 下的小弹窗编辑路径：
   - 不再使用 `EditDialog`。

## 结构调整
- 新组件：`src/lib/components/workspace/WorkspaceNoteInspector.svelte`
- 卡片区只负责触发事件，不承载编辑实现：
  - `src/lib/components/panel/WorkbenchSection.svelte` 增加 `openView` 回调并绑定 `ondblclick`
- 页面负责状态编排与保存：
  - `src/routes/workspace/+page.svelte`

## 设计收益
- 减少上下文跳转，查看和编辑一致性更好。
- 更适合后续扩展（字段、附件、命令、结构化信息）。
- 与 workspace 作为“复杂任务视图”的定位一致。

## 验证
- 双击卡片可打开详情查看。
- 编辑按钮可直接进入编辑态。
- 保存后列表与详情同步刷新。
