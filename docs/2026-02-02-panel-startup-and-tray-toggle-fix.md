# 启动显示与托盘点击不稳定修复

## 问题描述
- “启动时显示主窗口”有时不生效，窗口仍保持隐藏。
- 托盘图标偶发点击后主窗口没有被拉起。

## 根因分析
- Windows Runner 首帧会强制 `Show()`，但后续隐藏/显示可能被状态竞态影响。
- 仅依赖 `isVisible()` 判断会出现“窗口不可见但返回可见”的边界情况，导致点击逻辑走了 `hide()` 分支。

## 解决方案
1. 统一封装主窗口显示/隐藏/切换逻辑：
   - 支持最小化恢复、不可见时强制显示、可见但未聚焦时拉起。
2. 启动时根据设置强制显示或隐藏（首帧后再校准一次）。

## 代码改动
- `lib/services/panel_window_service.dart`
  - 新增 `show/hide/toggle`，统一窗口控制逻辑。
- `lib/services/panel_visibility_service.dart`
  - 首帧后根据设置强制校准显示状态。
- `lib/main.dart`
  - 启动流程中明确执行显示/隐藏。
- `lib/services/tray_service.dart`
  - 托盘点击/菜单统一走 `PanelWindowService`。
- `lib/services/hotkey_service.dart`
  - 快捷键切换也统一走 `PanelWindowService`。

## 手动验证
1. 勾选“启动时显示主窗口”后重启：主窗口应可见。
2. 取消勾选后重启：主窗口应隐藏。
3. 多次点击托盘图标：可见且聚焦时隐藏；不可见或未聚焦时显示。
4. 快捷键 Ctrl+Shift+N 行为与托盘一致。
