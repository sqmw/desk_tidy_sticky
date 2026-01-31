# 置顶切换后便签消失

> 说明：该文档针对“Top/Bottom 双 Overlay 全屏窗口”时期的实现。
> 2026-01-31 起切换为「方案C：每贴纸一个窗口」，详见 `docs/2026-01-31-per-note-windows.md`。

## 现象
- 点击「置顶显示」后，便签直接从桌面消失。
- 多见于编辑模式下或窗口层级切换频繁时。

## 根因
- 交互模式显示策略依赖 `_effectiveClickThrough`。
- 当某个 overlay 暂时没有便签时，`_effectiveClickThrough` 被判定为 `true`，
  使 `showAll` 变为 `false`，导致顶层窗口未显示应显示的便签。
- 结果是：便签从底层移走后，顶层窗口未显示（被误判为空）。

## 修复
- `showAll` 判断只取决于真实鼠标模式 `_clickThrough`，不再受 `_pinned` 为空影响。
- 交互模式始终保证 top overlay 展示全部便签，避免切换时“瞬间消失”。
- 为「置顶/置底切换」添加短暂保留窗口（800ms），避免窗口切换时两边都过滤掉。
- 监控 `isAlwaysOnTop` 变更（来自面板或其他窗口）并触发保留，避免跨窗口切换导致消失。

## 影响文件
- `lib/pages/overlay/overlay_page.dart`
