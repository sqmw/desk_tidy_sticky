# 托盘点击只能显示不能隐藏修复

## 问题描述
- 托盘图标点击后只能显示主窗口，无法隐藏。

## 根因分析
- 之前的切换逻辑要求窗口“可见且聚焦”才会执行隐藏。
- 托盘点击时窗口往往处于可见但未聚焦状态，导致逻辑走“显示”分支。

## 解决方案
- 增加 `toggleVisibility()`：只依据可见性切换，不受焦点影响。
- 托盘点击改用 `toggleVisibility()`；快捷键仍保持“未聚焦则拉起”的行为。

## 代码改动
- `lib/services/panel_window_service.dart`：新增 `toggleVisibility()`。
- `lib/services/tray_service.dart`：托盘点击改走 `toggleVisibility()`。

## 手动验证
1. 主窗口显示但未聚焦时，点击托盘图标应隐藏。
2. 主窗口隐藏时，点击托盘图标应显示。
3. Ctrl+Shift+N 行为保持不变（未聚焦则拉起）。
