# 2026-02-16 专注任务休息参数 + 独立休息间隔

## 目标
- 每个专注任务支持自己的休息控制参数（默认继承全局，支持单独修改）。
- 休息控制条支持“独立间隔”模式，用于非任务场景（如看书）下管理休息节奏。

## 设计
1. 任务级休息参数
- `FocusTask` 新增 `breakProfile`：
  - `miniBreakEveryMinutes`
  - `longBreakEveryMinutes`
- 为空时表示继承全局默认间隔。

2. 休息节奏来源
- 新增节奏来源模式：
  - `task`：跟随“当前任务 breakProfile”，若任务未配置则回退全局默认。
  - `independent`：使用独立间隔配置，不依赖任务。

3. 独立间隔配置持久化
- `pomodoroConfig` 扩展：
  - `breakScheduleMode`
  - `independentMiniBreakEveryMinutes`
  - `independentLongBreakEveryMinutes`
- 前端与 Rust 偏好结构同步，重启后保留配置。

## 代码变更
- 新增：`src/lib/workspace/focus/focus-break-profile.js`
  - 节奏模式常量、模式归一化、任务 breakProfile 归一化、有效休息配置解析。
- 更新：`src/lib/workspace/focus/focus-model.js`
  - `FocusTask` 增加 `breakProfile` 字段并纳入归一化。
- 更新：`src/lib/workspace/focus/focus-runtime.js`
  - `getSafeConfig` 支持新配置字段。
  - `buildFocusTaskFromDraft` / `updateTaskInState` 支持 `breakProfile`。
- 更新：`src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 休息计划改为基于 `resolveBreakTimingConfig(...)` 计算。
  - 新增节奏来源切换与独立间隔更新回调。
  - 新建任务时可写入 `breakProfile`，编辑任务可更新该字段。
- 更新：`src/lib/components/workspace/focus/WorkspaceFocusPlanner.svelte`
  - 新建任务表单新增“任务休息参数（默认/自定义）”。
- 更新：`src/lib/components/workspace/focus/WorkspaceFocusPlannerTaskItem.svelte`
  - 任务行展示当前休息间隔。
  - 编辑态支持修改任务级休息参数（默认/自定义）。
- 更新：`src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`
  - 休息控制条新增“节奏来源”切换和“独立间隔”输入。
- 更新：`src/lib/workspace/preferences-service.js`
- 更新：`src/lib/workspace/controllers/workspace-focus-actions.js`
- 更新：`src/routes/workspace/+page.svelte`
- 更新：`src-tauri/src/preferences.rs`
- 更新：`src/lib/strings.js`

## 交互结果
- 新建任务：可选默认休息参数或自定义小休/长休间隔。
- 编辑任务：可随时切换默认/自定义并保存。
- 休息控制条：
  - 切换到“跟随任务/默认”时，显示当前任务实际生效的间隔。
  - 切换到“独立间隔”时，直接设置独立小休/长休间隔。

## 验证
- `npm run check`：通过（0 errors / 0 warnings）。
- `cargo check`：通过（仅历史 warning）。
