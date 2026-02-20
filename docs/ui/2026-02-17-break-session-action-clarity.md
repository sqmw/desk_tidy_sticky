# 休息会话按钮可用性与文案澄清

## 问题
用户反馈「开启」按钮点不动，表现为：
1. 当前状态是“休息提醒已开启”。
2. 同时界面仍显示“关闭 / 开启”两个动作。
3. “开启”按钮处于禁用态，容易被误判为交互异常。

## 根因
原交互是“双按钮固定展示 + 条件禁用”：
1. 提醒已开启时，`开启`动作本质上是无意义操作，因此被禁用。
2. 但文案“关闭/开启”语义过于抽象，未表达“提醒会话开关”上下文，导致认知冲突。

## 调整
文件：
- `src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`
- `src/lib/strings.js`

### 1) 动作显隐改造
1. 当 `breakSessionActive = false`（提醒开启）：
   - 仅显示 `暂停提醒`（可点击）。
   - 不再显示不可点击的“恢复提醒”按钮。
2. 当 `breakSessionActive = true`（提醒暂停中）：
   - 显示 `暂停提醒`（可用于按新预设续期）。
   - 显示 `恢复提醒`（可立即结束暂停会话）。

### 2) 文案语义升级
1. `pomodoroBreakControlDisable`：
   - EN: `Pause reminders`
   - ZH: `暂停提醒`
2. `pomodoroBreakControlEnable`：
   - EN: `Resume reminders`
   - ZH: `恢复提醒`

## 结果
1. 不再出现“看见按钮但点不动”的主观故障感。
2. 动作与当前状态语义对齐：开启状态只给“暂停”，暂停状态才给“恢复”。
