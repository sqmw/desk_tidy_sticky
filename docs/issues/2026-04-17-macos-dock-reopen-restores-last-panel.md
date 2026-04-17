# macOS Dock 唤醒错误回到 mini 模式

## 判定

- 类型：Bug / 回归。
- 现象：用户当前使用 workstation（工作台）模式时，点击 macOS Dock 图标重新唤醒窗口，应用会错误切回 mini 模式。

## 根因

“最后一次面板”依赖 `lastPanelWindow` 偏好字段恢复，但原实现有两个隐患：

1. `switch-panel-window.js` 的 `saveLastPanelWindow()` 直接调用 `get_preferences + set_preferences`，绕开了统一的前端偏好写队列。
2. mini / workspace 是两个独立 WebView，各自持有独立的 `prefsCache`。当其中一个窗口使用旧缓存写回偏好时，可能把已经切到的 `workspace` 再覆盖回 `main`。

这会让 macOS `RunEvent::Reopen` 读取到错误的 `lastPanelWindow`，从而把 Dock 唤醒错误恢复到 mini。

## 修复

- `saveLastPanelWindow()` 改为走统一的 `updatePreferences()`。
- `updatePreferences()` 每次写入前都先读取最新后端偏好，再做 merge，而不是复用当前 WebView 的本地缓存。
- 面板切换时先写入 `lastPanelWindow`，再创建 / 显示目标窗口，减少新窗口启动阶段读到旧值的机会。

## 回归检查

1. 从 mini 切到 workstation 后，点击 Dock 图标唤醒，应该继续回到 workstation。
2. 从 workstation 切回 mini 后，点击 Dock 图标唤醒，应该继续回到 mini。
3. 工作台内修改主题、缩放、休息配置后，再通过 Dock 唤醒，不应再意外退回 mini。
