# 2026-02-13 Workspace Focus：休息会话支持“绑定任务 + 独立运行”

## 背景
- 之前的休息会话只有全局语义：开启后所有专注任务都暂停休息触发。
- 新需求是同时支持两种模式：
  - 绑定番茄任务（只影响当前绑定任务）。
  - 独立运行（不绑定任务，保持全局暂停语义）。

## 设计与落地
## 1) 会话模型升级（根因修复，不打补丁）
- 文件：`src/lib/workspace/focus/focus-break-session.js`
- 会话结构从：
```json
{ "mode": "none|30m|1h|2h|today", "untilTs": 0 }
```
- 升级为：
```json
{
  "mode": "none|30m|1h|2h|today",
  "untilTs": 0,
  "scope": "global|task",
  "taskId": "",
  "taskTitle": ""
}
```
- 兼容策略：
  - 旧数据自动归一化为 `scope: global`。
  - `scope: task` 但缺失 `taskId` 时回退为 `global`，避免脏数据导致会话失效。

## 2) 触发抑制规则升级
- 新增函数：`shouldSuppressBreakPromptBySession(session, selectedTaskId, nowTs)`
- 判定矩阵：
  - 会话无效/过期：不抑制。
  - `scope=global`：抑制全部休息触发。
  - `scope=task`：仅当 `selectedTaskId === session.taskId` 时抑制。

## 3) UI 交互升级（休息控制条）
- 文件：`src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`
- 新增会话作用域切换：
  - `独立运行`
  - `绑定任务`
- 当选择“绑定任务”且当前未选中任务时：
  - 会话启动按钮禁用。
  - 显示引导提示文案，避免“看似可点但无效”的体验。
- 会话激活时展示当前作用域与绑定信息，避免误解会话生效范围。

## 4) 状态链路统一
- `WorkspaceFocusHub` 与 `workspace-focus-actions`、`preferences-service`、`workspace/+page.svelte` 全链路同步 `scope/taskId/taskTitle` 字段。
- 重启恢复后，会话模式（绑定/独立）与绑定任务信息可正确保留。

## 文案更新
- 文件：`src/lib/strings.js`
- 新增中英文键：
  - `pomodoroBreakSessionScopeGlobal`
  - `pomodoroBreakSessionScopeTask`
  - `pomodoroBreakSessionBindTaskHint`
  - `pomodoroBreakSessionIndependentHint`

## 验证
- `npm run check`：通过（0 error / 0 warning）
- `cargo check`：通过（仅历史 warning）

