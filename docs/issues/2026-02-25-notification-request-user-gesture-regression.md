# Notification Permission Must Be User Gesture (2026-02-25)

## 判定
- 类型：`Bug/回归`

## 现象
- 控制台报错：
  - `Notification prompting can only be done from a user gesture.`
- 触发位置：`WorkspaceFocusHub.svelte` 初始化/定时流程。

## 根因
- 代码在非用户手势上下文（`onMount` 与计时触发路径）调用了 `Notification.requestPermission()`。
- 浏览器要求通知权限弹窗必须来自用户显式交互（点击/键盘手势），因此抛出错误。

## 修复策略
- 移除所有非手势路径上的权限申请。
- 权限申请仅保留在用户显式开启“休息提醒”的点击动作中。
- 发送通知函数只负责“已授权时发送”，不再隐式请求权限。

## 代码变更
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 新增 `ensureNotificationPermissionFromUserGesture()`
  - `setBreakReminderEnabled(true)` 时触发权限申请（用户点击上下文）
  - `onMount` 仅同步当前授权状态，不再调用 `requestPermission`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-break-notify.js`
  - `sendDesktopNotification()` 移除 `Notification.requestPermission()` 调用
  - 仅在 `Notification.permission === "granted"` 时发送通知

## 回归验证
1. 启动应用后不进行任何点击，观察控制台：不应再出现该报错。
2. 在休息控制区点击开启提醒（On）：
   - 首次应弹权限请求；
   - 允许后应正常发送桌面通知。
3. 在未授权状态下触发提醒计时：
   - 不弹权限窗口；
   - 不应再出现“user gesture”报错。
