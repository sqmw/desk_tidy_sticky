# 2026-01-27 — 禁用 Windows Aero Snap（窗口吸附）

## 问题
- 使用原生窗口拖拽（SC_MOVE）时，Windows 会在拖动到屏幕边缘触发 Aero Snap（吸附/分屏）。
- 对 Desk Tidy 系列这种“面板小窗”体验不友好：容易被系统强行贴边/最大化预览。

## 方案
- 标题栏使用 `DragToMoveArea`（原生拖拽，稳定跟手）。
- 启动时调用 `windowManager.setMaximizable(false)`（与 desk_tidy 同步）来避免 Aero Snap。

## 实现
- 面板 Header 使用 `DragToMoveArea`。
- 之前的手动拖拽实现保留为备选（若后续需要再切换）。

## 验证
1) 拖动稳定、不抖动、跟手。
2) 拖到屏幕边缘不再触发 Aero Snap 预览/吸附。
