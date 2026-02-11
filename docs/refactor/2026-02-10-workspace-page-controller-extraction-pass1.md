# Workspace 页面控制器拆分（Pass1）

日期：2026-02-10  
范围：`src/routes/workspace/+page.svelte` 业务函数拆分

## 背景
- `workspace/+page.svelte` 体量持续上升，页面内同时承担：
  - 详情面板编辑流程
  - 专注任务动作（开始/查看/延后）
  - 偏好持久化调用
- 影响：职责边界不清晰，后续回归风险提高。

## 本次拆分
### 1) 详情面板业务逻辑抽离
- 新增：`src/lib/workspace/controllers/workspace-inspector-actions.js`
- 抽离能力：
  - `openInspectorView / openInspectorEdit / closeInspector`
  - `handleInspectorClose / startInspectorEdit / cancelInspectorEdit / saveInspectorEdit`
  - `createLongDocument`
- 设计方式：
  - 通过依赖注入传入 `invoke / loadNotes / syncWindows` 与状态 getter/setter；
  - 组件保留状态，controller 仅处理流程。

### 2) 专注任务动作逻辑抽离
- 新增：`src/lib/workspace/controllers/workspace-focus-actions.js`
- 抽离能力：
  - `changePomodoroConfig`
  - `changeFocusTasks`
  - `changeFocusStats`
  - `changeFocusSelectedTask`
  - `handleDeadlineAction`（含 `snooze15/snooze30`）
- 设计方式：
  - 时间换算工具与 tab 切换作为依赖注入；
  - 避免 controller 直接耦合页面实现细节。

## 页面侧调整
- `workspace/+page.svelte` 改为：
  - 初始化 controller；
  - 解构方法并传给子组件。
- 结果：页面业务函数块明显缩减，流程更可读。

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`

## 后续建议（Pass2）
- 继续拆分 `workspace/+page.svelte`：
  - 事件订阅与生命周期（`notes_changed` / `overlay_input_changed`）抽到独立模块；
  - 页面样式块迁移到 `WorkspacePageShell.svelte` 或样式文件，进一步降低单文件体积。
