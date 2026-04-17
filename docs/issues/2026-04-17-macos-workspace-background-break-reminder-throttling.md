# macOS 后台休息提醒被挂起

## 判定

- 类型：Bug / 平台兼容问题。
- 现象：workstation（工作台）在 macOS 进入后台后，休息提醒不会按时触发；用户点击 Dock 图标恢复应用后，休息倒计时才马上开始。

## 根因

休息提醒虽然有 Rust watchdog 兜底，但真正把“开始休息”切换为前端倒计时和遮罩展示的链路，仍依赖 workstation WebView 内的 JS 运行态。

macOS 上 `WKWebView` 对隐藏 / 最小化 / 后台窗口默认会做 background throttling，可能节流甚至挂起定时器。这样一来：

1. 工作台前端的 `setInterval` 不再稳定推进。
2. 休息到点后的前端接收与处理也可能被延后到窗口重新活跃时。

## 修复

- 对 workstation WebView 显式设置 `backgroundThrottling = "disabled"`。
- Rust 侧通过 `WebviewWindowBuilder` 同步设置 `BackgroundThrottlingPolicy::Disabled`，确保启动时预创建的隐藏工作台窗口也沿用同一策略。

## 说明

- 这不是要求用户去系统设置里手动开启“后台运行”才能正常的功能。
- 当前修复优先解决 macOS 后台时 JS 被节流的问题。
- Tauri / Wry 对该能力的 macOS 支持依赖系统版本；较新的 macOS 版本效果更稳定。

## 回归检查

1. 工作台进入后台后，短休 / 长休仍能按时开始。
2. 不点击 Dock 图标，休息提醒也应正常触发。
3. 恢复前台后，不应再出现“刚点 Dock 就立刻补触发休息”的明显滞后感。
