# Focus Task Inline Edit Layout

## Context

The focus planner task row uses inline editing. The previous edit UI stacked fields in a narrow block even when the planner card had enough horizontal space, which made the edited row look sparse and visually unbalanced.

## Decision

Keep the inline editing interaction for now, but refactor the edit state into a three-row horizontal layout:

1. Core row: task title + task mode.
2. Schedule row: start/end/recurrence for time-window tasks, or target/flexible/recurrence for duration tasks.
3. Footer row: task-start reminder on the left, delete/cancel/save actions on the right.

This keeps the current interaction model stable while improving hierarchy and density. A drawer/modal can still be considered later if task properties grow substantially.

## Implementation

- `src/lib/components/workspace/pomodoro/WorkspaceFocusPlannerTaskItem.svelte`
  - Replaced the single edit grid with `task-edit-layout`, `task-edit-primary-row`, `task-edit-schedule-row`, and `task-edit-footer`.
  - Added a soft editing background instead of relying on a hard border only.
  - Unified edit controls through `--task-edit-control-height`.
  - Changed delete to a red ghost action and moved the primary save action to the far right.
- `src/lib/workspace/theme/theme-default-template-config.js`
  - Added the new edit layout classes to the theme template class list.

## Verification

- `pnpm -s check`

## Regression Notes

- This change is layout-only. Task update payloads, timer state, recurrence logic, and reminder logic are unchanged.

## Follow-up: Row Stretch Fix

The first pass improved the internal edit layout but did not force the planner list item to stretch across the full task list column. In CSS grid, the row could still shrink to its intrinsic content width.

Follow-up changes:

- `WorkspaceFocusPlanner.svelte`: `task-list` now declares `grid-template-columns: minmax(0, 1fr)`.
- `WorkspaceFocusPlannerTaskItem.svelte`: `task-item` now uses `width: 100%`, `box-sizing: border-box`, and `justify-self: stretch`.

Expected result: editing rows use the full planner card width, so the title/mode row, schedule row, and footer row align with the wide inline-edit design.

## Follow-up: Prefer Flex List Over Grid List

The task list is a vertical list, not a two-dimensional grid. To avoid intrinsic grid sizing causing edited rows to appear narrower than the planner card, the list container now uses column flex layout.

Follow-up changes:

- `WorkspaceFocusPlanner.svelte`: `task-list` uses `display: flex; flex-direction: column`.
- `WorkspaceFocusPlannerTaskItem.svelte`: `task-item` uses `flex: 0 0 auto` with `width: 100%`.

Expected result: each normal or editing task row occupies the full available list width consistently.

## Follow-up: Per-task Reminder Lead Time

Task-start reminders are task-level behavior. The global settings value is only the default lead time for tasks that do not override it.

Follow-up changes:

- `FocusTask` now persists `taskStartReminderLeadMinutes` with a normalized `1..60` minute range.
- The reminder clock uses `task.taskStartReminderLeadMinutes` first, then falls back to the global `pomodoroConfig.taskStartReminderLeadMinutes` default.
- The inline task edit footer now shows both the reminder toggle and the task-specific lead-minute input.
- The new reminder edit classes are added to the workspace theme selector index.

Expected result: each focus task can have its own reminder lead time while settings still define the default for unconfigured tasks.

## Follow-up: New Task Reminder Controls

The create-task form must expose the same task-start reminder semantics as inline editing. Otherwise users have to create a task first and then edit it just to configure reminder lead time.

Follow-up changes:

- `WorkspaceFocusHub.svelte`: added draft reminder state for `draftTaskStartReminderEnabled` and `draftTaskStartReminderLeadMinutes`.
- `WorkspaceFocusHubView.svelte`: passes the new draft bindings to the planner.
- `WorkspaceFocusPlanner.svelte`: shows reminder toggle + per-task lead-minute input under the add-task grid.
- `focus-task-draft-controller.js`: writes draft reminder settings into newly created tasks and resets the draft to the current default lead time after creation.
- `focus-runtime.js`: `buildFocusTaskFromDraft` forwards reminder fields to `normalizeFocusTask`.
- `theme-default-template-config.js`: added planner reminder classes to the workspace theme selector index.

Expected result: creating a focus task can set task-start reminder and task-specific lead minutes in one pass.

## Follow-up: Reminder Delivery Semantics

Task-start reminders are delivered through the workstation in-app notice first, with native system notification as an additional channel when permission is granted.

Current trigger rules:

- The task must run today.
- `taskStartReminderEnabled` must be true on that task.
- The current minute must be within `[task start - lead minutes, task start]`.
- A task reminder is sent at most once per task per day.
- If system notification permission is unavailable, the workstation still shows the in-app reminder notice.

Follow-up fix:

- Creating a task with task-start reminder enabled now requests notification permission from the same user gesture, matching the edit-task path.

## Follow-up: Visible In-app Reminder Fallback

A task-start reminder must be visible even when the operating system or WebView notification permission blocks desktop notifications.

Bug found:

- `tickTaskStartReminderClock` returned early when `notifyEnabled` was false, so tasks were not even checked if notification permission was unavailable.
- The trigger window ended before the task start minute, so a reminder could be missed when the app tick landed on the start minute.
- There was no in-app fallback, making failures look like the feature did nothing.

Follow-up changes:

- Task-start reminder checks no longer depend on desktop notification permission.
- The reminder window now includes the task start minute as a safety net.
- `WorkspaceFocusHub` now creates an in-app reminder notice for every due task reminder.
- Desktop notification is attempted only as an extra channel when permission is granted.
- `WorkspaceFocusHubView` renders a dismissible task-start notice between the timer/planner area and stats area.
- The new notice classes are included in the workspace theme selector index.

Expected result: when a task reminder becomes due, the user sees a visible workstation reminder even if system notifications fail.

## Follow-up: Dev-only Task Reminder Quick Test

Task-start reminders depend on wall-clock timing, so manual verification is slow. A development-only quick test now mirrors the break-control quick test pattern.

Follow-up changes:

- `WorkspaceFocusPlanner.svelte` imports `showDevQuickActions` from `src/lib/runtime/dev-flags.js`.
- In dev mode only, the create-task reminder row shows a `Reminder test / Trigger now` action.
- The test action immediately triggers the same in-app task-start reminder notice used by real reminders.
- If desktop notification permission is granted, the test also attempts the same system notification path.
- `WorkspaceFocusHub.svelte` builds the test payload from the current draft title/start time, falling back to the selected task or placeholder text.
- Release builds do not render this quick-test entry because `showDevQuickActions` is based on `import.meta.env.DEV`.

Verification:

1. Run `pnpm tauri dev` or `pnpm dev`.
2. Open workstation focus planner.
3. Confirm the quick-test button is visible beside task-start reminder controls.
4. Click it and confirm the in-app reminder notice appears immediately.
5. Build/release mode should not expose the quick-test button.

## Follow-up: Native Tauri System Notifications

The previous system notification path used the WebView/browser `Notification` API. In a Tauri desktop app this is not reliable enough and can fail without showing an OS-level notification.

Follow-up changes:

- Added `@tauri-apps/plugin-notification` to frontend dependencies.
- Added `tauri-plugin-notification` to `src-tauri/Cargo.toml`.
- Registered `tauri_plugin_notification::init()` in the Tauri builder.
- Added `notification:default` to the default capability.
- Replaced browser `Notification.permission`, `Notification.requestPermission()`, and `new Notification(...)` usage with Tauri notification plugin helpers.
- Kept the in-app task-start notice as the guaranteed visible channel. Native system notification is an additional OS-level channel when permission is granted.

Expected result: task-start reminders and break notifications can use native OS notifications in Tauri, while the workstation still shows an in-app fallback for task-start reminders.

Verification:

- `pnpm -s check`
- `cargo check -q --manifest-path src-tauri/Cargo.toml`

## Follow-up: Dev-mode Notification Identity

macOS notification banners shown from `pnpm tauri dev` may use the dev host process identity instead of the final bundled app identity. In that state, the banner title or icon can look like `desk_tidy_sticky Notifications`, `exec`, or another development-time process label even though `productName`, `identifier`, and bundle icons are configured correctly.

Current app identity configuration:

- `src-tauri/tauri.conf.json`
  - `productName`: `Desk Tidy Sticky`
  - `identifier`: `com.desk-tidy.sticky`
  - `bundle.icon`: `icon.png`, `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`

Practical rule:

- Do not use dev-mode notification name/icon as the final acceptance signal.
- Use a bundled app build to verify the real macOS notification identity.

Recommended verification flow:

1. Run a bundled build, for example `pnpm tauri build -- --bundles app`.
2. Launch the generated `.app` bundle directly.
3. Trigger the task reminder quick test or a real due reminder.
4. Check whether macOS shows the correct app name and icon in the notification banner.

If the bundled app still shows an incorrect notification identity, continue investigation from bundle metadata, app icon embedding, and macOS notification registration rather than from the dev runtime path.
