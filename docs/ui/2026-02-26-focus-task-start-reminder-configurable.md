# 2026-02-26 专注任务开始前提醒（用户可配置）

## 结论
- 新增“专注任务开始前提醒”功能，默认关闭。
- 是否提醒与提前分钟都由用户在番茄钟设置中控制。
- 提醒按“每天 + 任务”去重，同一任务同一天只提醒一次，避免通知轰炸。

## 配置契约
- 偏好字段（Rust/前端一致）：
  - `pomodoroTaskStartReminderEnabled: boolean`，默认 `false`
  - `pomodoroTaskStartReminderLeadMinutes: number`，默认 `10`，范围 `1..60`
- 前端归一化字段：
  - `taskStartReminderEnabled`
  - `taskStartReminderLeadMinutes`

## 触发规则
- 仅在以下条件同时满足时触发：
  - 提醒开关开启
  - 系统通知权限已授权
  - 任务属于当天任务且未完成
  - 当前时间位于 `[startTime - leadMinutes, startTime)` 分钟区间
- 触发后写入去重键 `${dateKey}:${taskId}`，当天不重复提醒。

## UI 变更
- `WorkspaceFocusTimer` 设置面板新增：
  - `任务开始提醒`（开关）
  - `提前提醒（分钟）`
- 保存设置时如果开关为开启，会在用户手势内请求一次通知权限。

## 回归验证
1. 进入工作台 -> 专注 -> 设置，开启“任务开始提醒”，提前分钟设为 `1`。
2. 创建一个即将开始的任务（例如当前时间后 1~2 分钟）。
3. 确认系统通知权限已允许。
4. 在开始前 1 分钟收到一次通知；同一任务同一天不再重复弹出。
5. 关闭“任务开始提醒”后不再触发该类通知。

## 影响文件
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/preferences.rs`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/preferences-service.js`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-runtime.js`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/controllers/workspace-focus-actions.js`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/workspace/+page.svelte`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusTimer.svelte`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/strings.js`
