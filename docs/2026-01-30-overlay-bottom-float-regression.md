# 置底切换后悬浮回归

> 说明：该文档针对“Top/Bottom 双 Overlay 全屏窗口”时期的实现。
> 2026-01-31 起切换为「方案C：每贴纸一个窗口」，详见 `docs/2026-01-31-per-note-windows.md`。

## 现象
- 贴纸从「置顶」切到「置底」后，会短暂悬浮在最上层。
- 点击任意地方后才恢复到桌面底部。

## 原因
- 贴纸窗口在切换到 WorkerW/底层时，Windows 会短暂保留旧的 z-order。
- 仅一次 `SetWindowPos(HWND_BOTTOM)` 不稳定，导致视觉上仍在最上层。

## 解决方案
- 对置底窗口增加“延迟复位”：
  - 切换后立即 `HWND_BOTTOM`
  - 120ms/360ms 两次延迟再次强制 `HWND_BOTTOM` 并重试 attach WorkerW

## 影响文件
- `lib/pages/overlay/overlay_page.dart`
