# 2026-01-27 — UI 样式统一（对齐 desk_tidy 家族）

## 目标
- 颜色、圆角、字体与 desk_tidy 保持一套视觉语言，减少割裂感。
- 关键控件（头部、列表、Overlay 卡片/工具条）统一用同一套主题。

## 变更
- 新增 `lib/theme/app_theme.dart`：集中定义主色（蓝）、强调色（便笺暖黄）、表面色、圆角、按钮/输入等默认样式。
- 便笺卡片样式提取：`lib/theme/note_card_style.dart`，Overlay 便笺统一使用。
- 主应用主题改为 `AppTheme.buildTheme()`（取代默认 seedColor）。
- Panel Header、列表、Overlay 工具条/卡片采用统一配色和圆角，移除重复刷新按钮。

## 影响
- 整体视觉更接近 desk_tidy：蓝主色 + 暖色便笺卡 + 圆角 12/18。
- 功能不变，仅样式调整。
