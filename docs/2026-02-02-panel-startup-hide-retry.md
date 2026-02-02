# 启动主窗口强制隐藏重试

## 问题描述
- 关闭“启动时显示主窗口”后，主窗口仍会在启动时显示。

## 根因分析
- Windows Runner/插件会在首帧后强制 `Show()`，导致单次 `hide()` 被覆盖。
- 需要在启动的短时间窗口内进行多次隐藏校准。

## 解决方案
- 新增 `ensureHidden()`：先隐藏，再在短时间内多次重试隐藏，直到真正不可见。
- 启动流程与首帧回调均使用 `ensureHidden()`。

## 代码改动
- `lib/services/panel_window_service.dart`: 新增 `ensureHidden()`。
- `lib/services/panel_visibility_service.dart`: 首帧隐藏改为 `ensureHidden()`。
- `lib/main.dart`: 启动时隐藏改为 `ensureHidden()`。

## 手动验证
1. 关闭“启动时显示主窗口”后重启：主窗口应保持隐藏。
2. 若仍短暂出现，0.5~1s 内应被自动隐藏。
