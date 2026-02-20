# 工作台专注区：休息控制倒计时与文案清理

> 后续结构收敛见：`docs/ui/2026-02-17-break-control-simplification.md`

## 问题
1. 切到「休息控制」tab 后，右上角仍显示番茄倒计时（如 `25:00`），语义冲突。
2. 休息控制区缺少更直观的短休/长休倒计时展示。
3. UI 文案中出现 `Stretchly` 字样，不符合当前产品文案要求。

## 处理方案

### 1) 休息控制 tab 顶部信息重构
文件：`src/lib/components/workspace/focus/WorkspaceFocusTimer.svelte`

调整：
1. 新增 props：
   - `breakMiniCountdownText`
   - `breakLongCountdownText`
2. 当 `showBreakPanel === true` 时：
   - 不再显示番茄主计时 `timerText`
   - 改为显示两项倒计时：
     - `下次小休: mm:ss`
     - `下次长休: mm:ss`
3. 补充响应式样式，窄宽时倒计时自动换行，避免挤压。

### 1.1) 休息控制卡片内倒计时视觉强化
文件：`src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`

调整：
1. 原先一行文本改为双卡布局：
   - 小休倒计时卡
   - 长休倒计时卡
2. 倒计时数字放大并采用等宽数字字体，提升扫读速度。
3. 提醒状态改为独立 pill，避免和倒计时混排。
4. 小屏自动降级为单列，保证不挤压。

### 2) 倒计时格式统一
文件：`src/lib/components/workspace/WorkspaceFocusHub.svelte`

调整：
1. 休息控制顶部倒计时改为 `formatTimer(...)`（`mm:ss`）。
2. 传给 `WorkspaceBreakControlBar` 的短休/长休倒计时同样改为 `mm:ss`，保证显示一致。

### 3) 去除 Stretchly 文案
文件：
- `src/lib/strings.js`
- `src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`
- `src/lib/components/workspace/WorkspaceFocusHub.svelte`

调整：
1. `pomodoroBreakReminderModeFullscreen`：
   - EN: `Full-screen reminder`
   - ZH: `全屏提醒`
2. `pomodoroBreakReminderModeFullscreenHint` 改为通用全屏提醒描述，不再出现 `Stretchly` 字样。
3. 组件 fallback 文案同步改为通用描述。

### 4) 倒计时独立时钟修复（短休/长休不再卡住）
文件：`src/lib/components/workspace/WorkspaceFocusHub.svelte`

根因：
1. 休息倒计时 tick 之前由两个分支 effect 承担（`running` 和 `!running`），在交互路径切换时容易出现“未进入有效 tick 分支”的停滞感知。

调整：
1. 合并为单一时钟源（`onMount + setInterval`）：
   - 只要当前 phase 是 `focus`，每秒统一执行 `tickBreakReminderClock()`。
   - 非 `focus` 时仅刷新 `nowTick`（保持会话剩余时间显示更新）。
2. 从番茄主倒计时 effect 中移除 `tickBreakReminderClock()`，避免重复驱动和时序竞争。
3. 移除旧的 `!running && phase===focus` 独立 effect，统一到单时钟路径，降低状态分叉。

结果：
1. 即便番茄主计时未运行，只要处于专注阶段，短休/长休倒计时也会连续递减。
2. UI 上“下次小休/下次长休”与休息控制卡片内倒计时保持一致同步。

## 验证
1. `npm run check` 通过（0 error / 0 warning）。
2. `cargo check` 通过（仅现有 Rust dead_code warning）。
3. 手动预期：
   - 切换到休息控制 tab，右上角显示双倒计时，不再是 `25:00`。
   - 休息控制面板内以双卡样式显示短休/长休倒计时（`mm:ss`）。
   - 界面不再出现 `Stretchly` 文案。
   - 专注阶段不启动主番茄时，短休/长休倒计时也会每秒变化。
