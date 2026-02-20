# 工作台休息控制简化重构（单一模式）

## 背景
用户反馈当前「休息控制」信息和按钮过多，存在明显认知负担：
1. `提醒状态 / 暂停预设 / 30分钟/1小时/2小时` 等内容不符合核心诉求。
2. 用户实际只需要：
   1. 短休间隔
   2. 长休间隔
   3. 短休时长
   4. 长休时长
   5. 一键开启/关闭提醒

## 本次改动

### 1) 休息控制面板改为单一职责
文件：`src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`

调整：
1. 删除复杂控制区：
   - 暂停预设
   - 会话时段（30m/1h/2h/今天）
   - 提醒方式切换
   - 冗余状态文案
2. 保留并强化核心区：
   - 下次小休倒计时
   - 下次长休倒计时
   - 独立小休间隔（分钟）
   - 独立长休间隔（分钟）
   - 小休时长（秒）
   - 长休时长（分钟）
   - 开启提醒 / 关闭提醒
3. 当提醒已触发（`breakPrompt`）时，仅保留必要动作：
   - `开始休息`
   - `跳过`

### 2) 休息提醒增加明确开关
文件：
- `src/lib/components/workspace/WorkspaceFocusHub.svelte`
- `src/lib/workspace/focus/focus-runtime.js`
- `src/lib/workspace/preferences-service.js`
- `src/lib/workspace/controllers/workspace-focus-actions.js`
- `src/routes/workspace/+page.svelte`
- `src-tauri/src/preferences.rs`

调整：
1. 新增配置字段：`breakReminderEnabled`（默认 `true`）。
2. 触发逻辑收敛：
   - 关闭提醒时，不再推进休息提醒计时与触发。
   - 开启提醒时，重置提醒时钟并从当前配置重新开始计时。
3. 偏好持久化打通：
   - 前端 normalize/load/save 全链路新增该字段。
   - Rust `PanelPreferences` 新增 `pomodoro_break_reminder_enabled` 字段并默认开启。

### 3) 文案同步
文件：`src/lib/strings.js`

调整：
1. `pomodoroBreakControlEnable` -> `开启提醒 / Enable reminders`
2. `pomodoroBreakControlDisable` -> `关闭提醒 / Disable reminders`
3. `pomodoroBreakActionHint` 改为“开启后按间隔自动触发提醒”的说明文案。

### 4) 严重计时 bug 修复：短休不再重置长休倒计时
文件：`src/lib/components/workspace/WorkspaceFocusHub.svelte`

问题：
1. 原实现在 `applyBreakNow(kind)` 中无条件执行 `focusSinceBreakSec = 0`。
2. 导致用户进入短休后，长休倒计时被重新拉满，和预期不符。

修复：
1. 仅在 `kind === "long"` 时重置 `focusSinceBreakSec`。
2. `kind === "mini"` 时不重置累计专注秒数，只重排下一次短休触发点：
   - `nextMiniBreakAtSec = focusSinceBreakSec + breakPlanSec.miniEverySec`
3. 结果：短休开始/结束后，长休倒计时连续，不再跳回初始值。

### 5) 冲突优先级修复：长休优先于短休
文件：`src/lib/components/workspace/WorkspaceFocusHub.svelte`

规则：
1. 当同一时刻短休与长休同时满足触发条件时，统一选择长休。
2. 触发面板不允许“从长休降级回短休”。

实现：
1. 在 `tickBreakReminderClock()` 中显式计算 `dueKind`：
   - `long` due 优先；
   - 否则才是 `mini` due。
2. 在 `openBreakPrompt(kind)` 增加保护：
   - 当前已是长休提示时，忽略后续短休覆盖请求。

## 验证
1. `npm run check`：通过（0 error / 0 warning）。
2. `cargo check`：通过（仅已有 dead_code warning）。

## 结果
休息控制页面从“多模式混合”收敛为“单一提醒配置模式”，交互路径更短、语义更清晰，符合用户提出的核心模型：  
`设置间隔 + 设置时长 + 开关提醒 -> 到点提醒休息`。
