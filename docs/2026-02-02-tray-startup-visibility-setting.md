# 托盘首次点击无响应与启动显示设置

## 背景与问题
- 首次启动应用时，主窗口会被 Flutter Runner 强制显示（首帧回调 `Show()`）。
- 用户期望首次启动处于“未显示”状态，托盘首次点击应切换显示，但实际因为已显示导致“看起来没反应”。

## 目标
- 允许用户配置“启动时显示主窗口”。
- 默认隐藏主窗口，确保托盘首次点击可以稳定触发“显示”。

## 方案与实现
- 新增偏好 `panel_show_on_startup`，通过 `PanelPreferences` 持久化。
- 新增 `PanelVisibilityService.applyStartupVisibility`：
  - 在首帧之后执行隐藏，覆盖 Runner 的强制 `Show()`。
  - 保留启动时的 `waitUntilReadyToShow` 隐藏，减少闪屏。
- 设置面板新增开关：`启动时显示主窗口`。

## 代码改动
- `lib/services/panel_preferences.dart`：新增读写 `panel_show_on_startup`。
- `lib/services/panel_visibility_service.dart`：首帧后执行隐藏。
- `lib/main.dart`：读取启动显示设置并应用。
- `lib/pages/panel/settings_dialog.dart`：新增设置项。
- `lib/l10n/strings.dart`：新增文案。

## 手动验证
1. 默认启动（未勾选“启动时显示主窗口”）：应用启动后主窗口保持隐藏，托盘点击一次显示主窗口。
2. 勾选“启动时显示主窗口”：启动时主窗口可见，托盘点击一次隐藏主窗口。

## 注意事项
- 若未来调整 Runner 显示逻辑，需确认首帧隐藏仍生效。
- 该设置仅影响主窗口（Panel），不影响贴纸（Overlay）与便笺子窗口。
