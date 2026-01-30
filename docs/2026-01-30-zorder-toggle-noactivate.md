# 修复：切换「置顶显示 / 贴在底部」时意外激活/点击到其它窗口

## 现象
- 在 Overlay 模式下，点击便签的「置顶显示 / 贴在底部」按钮后：
  - Z-order 的逻辑是正确的（便签会切换到对应层级）
  - 但会出现“像是顺带点击/激活了某个其它窗口”的副作用：其它窗口被置前/获得焦点

## 根因定位（Windows）
该问题本质是 **窗口 Z-order / show 操作没有显式禁止激活（activation）**，导致 Windows 在切换过程中改变前台窗口/焦点，从而看起来像“触发了对其它窗口的点击”。

两处典型触发点：
1. `windowManager.show()` 在 Windows 侧最终会走 `SW_SHOWNORMAL`，可能激活窗口（夺走焦点）。
2. `SetWindowPos(..., SWP_SHOWWINDOW)` 等调用如果未带 `SWP_NOACTIVATE`，也可能带来激活/前台切换副作用。

## 解决方案
目标：**Z-order/Show 只改变层级/可见性，不改变激活状态**。

实现要点：
- 新增 `WindowZOrderService`：在 Windows 上使用 Win32 API 做“无激活”版本的置顶/显示。
  - `setAlwaysOnTopNoActivate()`：使用 `SetWindowPos` + `SWP_NOACTIVATE`
  - `showNoActivate()`：使用 `ShowWindow(SW_SHOWNOACTIVATE)` + `SetWindowPos(... SWP_NOACTIVATE | SWP_SHOWWINDOW ...)`
- `WorkerWService` 的 `SetWindowPos` 增加 `SWP_NOACTIVATE`，避免 attach/detach 过程改变前台窗口。
- `OverlayPage` 中所有用于“刷新/重申状态”的 `show()` 与 `setAlwaysOnTop()` 切换为上述无激活实现。

相关代码：
- `lib/services/window_zorder_service.dart`
- `lib/services/workerw_service.dart`
- `lib/pages/overlay/overlay_page.dart`

## 手动验证步骤（建议）
1. 启动主面板，打开 Overlay（多进程）。
2. 选一条已 Pin 的便签，在 Overlay 或主面板列表中反复点击「置顶显示 / 贴在底部」切换。
3. 观察：
   - 便签层级切换正确
   - **不会**出现其它应用窗口被置前/抢焦点（尤其是在鼠标当前位置下方的窗口）
4. 在系统托盘菜单打开时进行同样操作，确认菜单不会被无故关闭（避免 focus stealing）。

