# 2026-02-12 Workspace Focus：Phase3 全局休息会话（30m/1h/2h/今天）

## 目标
- 在 Phase2 的“休息提醒 + 延后/跳过/严格模式”基础上，增加全局休息会话。
- 用户可按时间段临时暂停休息触发：
  - `30m`
  - `1h`
  - `2h`
  - `今天内`
- 支持持久化，应用重启后恢复状态。

## 设计
### 1) 会话语义
- 会话激活期间：
  - 休息触发点命中时，不弹出 break prompt。
  - 系统继续推进下一次小休/长休窗口，避免卡死在同一触发点。
- 会话到期后自动清除，恢复正常提醒流程。

### 2) 数据模型
- 新增偏好字段：`focusBreakSessionJson`
- 结构：
```json
{ "mode": "none|30m|1h|2h|today", "untilTs": 0 }
```
- `untilTs` 为毫秒时间戳。

### 3) 运行时拆分
- 新增 `src/lib/workspace/focus/focus-break-session.js`：
  - 会话模式常量
  - `normalizeBreakSession`
  - `createBreakSession`
  - `isBreakSessionActive`
  - `getBreakSessionRemainingText`
- UI 与运行时逻辑解耦：会话计算不塞到视图组件内。

## UI 改动
- `WorkspaceBreakControlBar.svelte` 新增会话按钮组：
  - `30m / 1h / 2h / 今天内 / 取消暂停`
- 显示当前会话状态与剩余时长。
- 保留原有休息操作（开始休息/延后/跳过），与 strict 模式联动不变。

## 持久化路径
- Rust 偏好：`src-tauri/src/preferences.rs` 新增 `focus_break_session_json`
- 前端读取：`loadWorkspacePreferences`
- 前端保存：`workspace-focus-actions.changeFocusBreakSession`

## 影响文件
- `src/lib/workspace/focus/focus-break-session.js`（新增）
- `src/lib/components/workspace/WorkspaceFocusHub.svelte`
- `src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`
- `src/lib/workspace/preferences-service.js`
- `src/lib/workspace/controllers/workspace-focus-actions.js`
- `src/routes/workspace/+page.svelte`
- `src/lib/strings.js`
- `src-tauri/src/preferences.rs`

## 验证
- `npm run check` 通过（0 error / 0 warning）
- `cargo check` 通过（仅历史 warning）

