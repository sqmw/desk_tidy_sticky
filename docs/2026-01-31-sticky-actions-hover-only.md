# 贴纸：操作按钮仅在鼠标交互时显示

## 背景 / 问题
- 贴纸底部的操作按钮（编辑/完成/取消钉住/置顶/删除）一直显示，容易产生视觉干扰，并在某些场景下造成“遮挡感”。

## 目标
- 默认不显示操作按钮。
- 仅在鼠标交互状态下（hover 到贴纸卡片区域）才显示按钮。
- 交互体验平滑，不引入窗口尺寸抖动。

## 方案
### 1) UI 控制（actionsVisible）
- 给 `StickyNoteCard` 增加 `actionsVisible` 参数。
- 按钮行使用 `AnimatedOpacity` 做淡入淡出；同时用 `IgnorePointer` 防止隐藏状态下误触。
- 保留按钮行的布局高度（仅改变透明度），避免 hover 时卡片高度变化导致的窗口/布局抖动。

### 2) 鼠标交互检测（HoverStateBuilder）
- 新增 `HoverStateBuilder`（基于 `MouseRegion`）为任意 child 提供 `hovering` 状态。
- 在 `OverlayPage` / `NoteWindowPage` 中，用 `HoverStateBuilder` 驱动 `StickyNoteCard(actionsVisible: hovering)`。

## 行为说明
- 鼠标移入贴纸：操作按钮显示。
- 鼠标移出贴纸：操作按钮隐藏。
- **Click-through 模式**下窗口会忽略鼠标事件：无法 hover，因此按钮保持隐藏（符合“非交互时不显示”的目标）。

## 相关文件
- `lib/pages/overlay/sticky_note_card.dart`
- `lib/widgets/hover_state_builder.dart`
- `lib/pages/overlay/overlay_page.dart`
- `lib/pages/note_window/note_window_page.dart`

