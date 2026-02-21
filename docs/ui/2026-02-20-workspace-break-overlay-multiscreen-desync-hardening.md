# Workspace 休息覆盖层多屏不同步与卡死修复（2026-02-20）

## 问题现象
1. 多屏休息倒计时过程中，某一屏会突然退回默认英文文案（`Take a break / Remaining 00:00`）。
2. 该异常屏幕会卡住，无法自动收起，点击也可能无响应。
3. 另一屏仍在正常倒计时，表现为“单屏失步”。

## 根因
1. `ensureBreakOverlayWindows()` 在部分链路会重复触发，而旧实现会对已存在窗口执行“先关闭再重建”。
2. 重建期间若握手时序抖动，overlay 页面会短暂回到默认态（英文兜底文案）。
3. 同步事件对单窗口失败缺少隔离，个别窗口 emit 失败可能影响整体链路稳定。
4. overlay 页面进入自关闭后，关闭命令若超时/失败，容易进入“自关闭锁死”状态。

## 修复策略
### 1) 覆盖层窗口改为优先复用
- 文件：`src/lib/workspace/focus/focus-break-overlay-windows.js`
- 调整：
  - 已存在窗口不再强制重建；
  - 改为“复用 + 重新设置几何 + 重新应用运行态（top/focus/shadow/input）”；
  - 仅复用失败时才回退到重建。

### 2) 同步事件按窗口容错
- 文件：`src/lib/workspace/focus/focus-break-overlay-windows.js`
- 调整：
  - `emitBreakOverlayState(...)` 改为逐窗口 try/catch；
  - 单窗口失败不会中断其他窗口同步；
  - 对失败窗口执行 `hide -> close -> destroy` 清理；
  - 函数返回健康 label 列表，供上层收敛状态。

### 3) Host 侧确保链路单通道
- 文件：`src/lib/components/workspace/WorkspaceFocusHub.svelte`
- 调整：
  - 新增 `ensureBreakOverlayLabels()`，将 overlay 初始化变为单飞 Promise；
  - `syncBreakOverlay()` 与生命周期入口统一复用该初始化函数；
  - payload 去重 key 增加 label 维度，防止 label 变化时误判“无需同步”；
  - 接收健康 label 回写，避免失效 label 长期留存导致假同步。

### 4) Overlay 页面自恢复增强
- 文件：`src/routes/break-overlay/+page.svelte`
- 调整：
  - 默认文案按系统语言初始化（中文环境不再退回英文默认文案）；
  - 增加“超时关闭重试”机制，避免一次 close 卡住后永久失效；
  - 增加“payload 静默超时重握手”，减少单窗口失步后无法恢复。

## 验证
1. `npm run check`：通过（0 error / 0 warning）。
2. `cargo check`：通过（仅现有 dead_code warning）。

## 影响范围
1. 仅涉及 Workspace 休息 overlay 的多屏同步/关闭链路。
2. 不改偏好字段结构，不影响历史数据兼容。

