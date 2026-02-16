# 2026-02-16 休息提醒方式全局化（休息控制统一配置）

## 背景
- 反馈：休息提醒方式应统一在“休息控制”里配置，并全局生效。
- 需求：提供两种提醒样式可选：
  - Stretchly 风格全屏提醒
  - 轻提示提醒（不接管整个窗口）

## 方案
1. 新增全局配置字段 `breakReminderMode`
- 取值：`fullscreen` / `panel`
- 含义：
  - `fullscreen`：休息触发时显示全屏遮罩提示
  - `panel`：显示轻量提示卡片
- 配置归一化后进入统一 `pomodoroConfig`，并持久化到偏好设置。

2. 统一配置入口到休息控制条
- 在 `WorkspaceBreakControlBar` 新增“提醒方式”按钮组选项。
- 用户切换后立即调用 `onPomodoroConfigChange`，全局生效，不绑定单个任务。

3. 休息触发渲染分支
- `WorkspaceFocusHub` 根据 `breakReminderMode` 决定展示：
  - `fullscreen`：全屏遮罩 + 操作按钮（开始/延后/跳过）
  - `panel`：保留轻提示卡片

## 关键改动
- 新增：`src/lib/workspace/focus/focus-break-reminder-mode.js`
  - 提供模式常量、可选项与归一化函数。
- 更新：`src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`
  - 新增提醒方式切换 UI 与回调。
- 更新：`src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 新增全屏/轻提示渲染分支。
  - 新增 `changeBreakReminderMode` 配置更新逻辑。
- 更新：`src/lib/workspace/focus/focus-runtime.js`
  - `getSafeConfig` 纳入 `breakReminderMode`。
- 更新：`src/lib/workspace/preferences-service.js`
  - `normalizePomodoroConfig`、默认值、加载链路纳入 `breakReminderMode`。
- 更新：`src/lib/workspace/controllers/workspace-focus-actions.js`
  - `changePomodoroConfig` 持久化 `pomodoroBreakReminderMode`。
- 更新：`src/routes/workspace/+page.svelte`
  - 默认 `pomodoroConfig` 增加 `breakReminderMode`。
- 更新：`src-tauri/src/preferences.rs`
  - `PanelPreferences` 增加 `pomodoro_break_reminder_mode` 默认字段，保证重启后可恢复。
- 更新：`src/lib/strings.js`
  - 增加提醒方式相关中英文文案。

## 验证
- `npm run check`：通过（0 errors / 0 warnings）。
- `cargo check`：通过（仅历史 warning）。
