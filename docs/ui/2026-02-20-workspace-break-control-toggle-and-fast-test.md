# Workspace 休息控制开关与快速联调（2026-02-20）

## 背景
针对当前休息控制体验的三个问题做收敛修复：
1. `开启提醒/关闭提醒` 是两个文案按钮，状态感知弱。
2. 休息触发间隔过长，不利于开发联调与验收。
3. 调整到较短间隔后，开启提醒仍按旧值（如 10 分钟）运行。

## 本次改动

### 1) 开关交互统一为单一 Toggle
- 文件：`src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`
- 原按钮替换为左右二段开关（`关闭 | 开启`），避免双按钮语义重复。
- 交互语义：
  - 左侧：关闭
  - 右侧：开启
- 术语：该控件属于 `Toggle Switch / Segment Toggle`。

### 2) 间隔输入改为即时生效 + 下限放宽
- 文件：`src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`
- 将短休/长休间隔输入下限改为 `1` 分钟。
- 输入监听从仅 `change` 扩展为 `input + change`，避免“未失焦时值未提交”的错觉。

### 3) 快速测试入口（10 秒触发）
- 文件：`src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`
- 新增“快速测试”入口：
  - `短休 10秒`
  - `长休 10秒`
- 对应联动：`src/lib/components/workspace/WorkspaceFocusHub.svelte` 中 `scheduleBreakSoon(kind, seconds)`。

### 4) 修正休息间隔旧限制残留
- 文件：`src/lib/components/workspace/WorkspaceFocusHub.svelte`
- 把仍残留的 5/15 分钟下限统一改为 1 分钟：
  - 任务 breakProfile 的保存/创建路径
  - 设置保存路径（mini/long interval）

### 5) 配置归一化保持一致
- 文件：
  - `src/lib/workspace/focus/focus-runtime.js`
  - `src/lib/workspace/focus/focus-break-profile.js`
  - `src/lib/workspace/preferences-service.js`
- 统一允许 1 分钟级间隔并保持独立间隔与任务间隔归一化一致。

### 6) 文案补充
- 文件：`src/lib/strings.js`
- 新增键：
  - `pomodoroBreakToggleLabel`
  - `pomodoroToggleOff`
  - `pomodoroToggleOn`
  - `pomodoroBreakQuickTest`
  - `pomodoroBreakQuickMini10s`
  - `pomodoroBreakQuickLong10s`

## 验证
- `npm run check`：通过（0 errors / 0 warnings）
- `cargo check`：通过（仅既有 warning，无新增错误）

## 影响说明
- 休息提醒配置更适合开发与验收测试，不再需要长时间等待。
- 用户可直接通过单一开关理解当前状态，避免“开/关按钮并列”认知负担。
- 间隔值提交更及时，减少“设置值与运行值不一致”的体感问题。
