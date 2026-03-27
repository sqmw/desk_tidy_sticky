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

## 2026-03-26 补充：非运行休息相位残留导致休息控制倒计时停滞

### 判定
- 类型：`Bug/回归`
- 现象：工作台专注区顶部已经落在 `短休息/长休息` 标签，但主休息态并未真正运行；此时 `休息控制` 中的 `下次小休/下次长休` 固定在默认值，看起来完全不动。

### 根因
1. 历史实现里，休息控制仍复用了番茄 `phase` 和休息态信息。
2. 计时运行态恢复时，如果缓存里残留了一个“非运行中的短休/长休 phase”，组件会原样恢复这个 phase。
3. 休息控制与番茄钟共享 phase 后，一旦主番茄 runtime 处在异常残留态，独立休息提醒链也会被误伤。

### 修复
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`

1. 新增 `shouldTickBreakReminderClock()`：
   - 只要休息提醒已开启，且当前没有正在执行中的休息 overlay，就继续独立 tick。
   - 不再依赖番茄 `focus/shortBreak/longBreak` phase。
2. 恢复缓存时增加归一化：
   - 若缓存为 `shortBreak/longBreak`，且 `running !== true` 且不存在 `activeBreakKind`，
   - 说明这是一个空转的旧休息态，不应作为下次启动的真实运行态恢复；
   - 自动回收到 `focus`，并恢复主专注时长。
3. 休息 overlay 运行时改为使用独立的 `breakRemainingSec`，不再复用番茄主倒计时 `remainingSec`。

### 行为结果
1. 休息控制的独立倒计时不再被“残留短休/长休相位”卡住。
2. 重新启动工作台后，不再把一个非运行中的旧休息 phase 带成当前主状态。
3. 休息控制与番茄钟计时链路解耦，overlay 不再显示 `未选择` 之类的任务占位文案。

### 回归步骤
1. 进入工作台 -> 专注 -> 休息控制，开启提醒。
2. 将小休改成 `1` 分钟，或点击 `短休 10秒` 快速联调。
3. 确认顶部 `下次小休/下次长休` 与面板内数字开始连续递减。
4. 重启应用后再次进入专注页，确认不会因为残留 `短休息/长休息` 状态导致倒计时静止。

## 2026-03-26 补充：番茄 phase 移除后的运行态约束

### 判定
- 类型：`设计收敛`

### 新约束
1. `WorkspaceFocusHub` 中主番茄计时只允许保存 `focus` phase。
2. 历史缓存如果恢复出 `shortBreak / longBreak`，会在加载时直接归一到 `focus` 且停止运行。
3. `breakRemainingSec` 继续只服务于独立休息控制 overlay，不与番茄主倒计时复用。

### 结果
1. 番茄主计时结束后，只会回到新的专注准备态。
2. 休息控制提醒不再受到旧番茄休息态缓存干扰。
