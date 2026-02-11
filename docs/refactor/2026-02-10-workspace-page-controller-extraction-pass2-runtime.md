# Workspace 页面控制器拆分（Pass2 Runtime）

日期：2026-02-10  
范围：`workspace/+page.svelte` 生命周期与运行时监听抽离

## 背景
- Pass1 已拆分详情编辑与专注动作；
- 页面内仍保留 `onMount` 启动与事件订阅逻辑，职责仍偏重。

## 本次改动
### 新增运行时生命周期控制器
- 新增文件：`src/lib/workspace/controllers/workspace-runtime-lifecycle.js`
- 负责：
  - 启动流程：加载偏好、加载便笺、发出 `workspace_ready`
  - 窗口最大化状态同步
  - 贴纸交互状态同步
  - 运行时监听与清理：
    - `notes_changed`（含防抖 + suppress 窗口）
    - `overlay_input_changed`
    - `deadlineNowTick` 心跳更新

### 页面侧调整
- `workspace/+page.svelte` 的 `onMount` 改为调用控制器方法；
- 页面保留状态变量与 UI 绑定，运行时流程由 controller 统一管理。

## 架构收益
- 组件页面更聚焦“状态装配 + 视图绑定”；
- 生命周期与副作用逻辑集中，后续调试入口更单一；
- 进一步降低页面文件耦合度，利于继续拆分。

## 验证
- 执行：`npx svelte-check --tsconfig ./jsconfig.json`
- 结果：`0 errors, 0 warnings`
