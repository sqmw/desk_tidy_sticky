# 面板列表：按钮挤占文本显示区域

## 现象
- 面板列表的每条便签右侧按钮过宽，导致左侧正文区域被严重挤压。
- 长文本几乎只剩一小块可见区域，不符合“内容优先”。

## 原因
- `ListTile.trailing` 使用 `Row` 且按钮数量多。
- 在小宽度面板（360px）下，trailing 区域会抢占主内容宽度。

## 修复
- 不再使用 `ListTile.trailing`（其高度不随 trailing 增长，容易导致底部 overflow）。
- 改为自定义 `Row` 布局：左侧 `Expanded` 文本/时间，右侧固定宽度动作区（`Wrap` 自动换行）。
- 继续使用紧凑按钮样式（`_TinyIconButton`）控制最小尺寸与 padding。
- 排序拖动改为“长按整条便签开始拖动”（移除 `drag_handle` 图标），并通过 `proxyDecorator`
  给拖动中的条目添加轻微“抬起”动效（scale + elevation）。
## 排序拖动交互（重要）
- 由于列表项支持左右滑动（`Dismissible`），如果用“整行手势识别后再启动 reorder”这种做法，会在 Flutter 手势竞技场里触发断言（`GestureArena` / `MultiDrag`），
  在 Windows debug 下会出现大量异常并导致多窗口被销毁重建。
- 现在改为稳定方案：提供一个明确的“拖动排序”把手（`ReorderableDragStartListener` + `drag_indicator` 图标）。
  - 优点：不需要长按，且不会与左右滑动冲突。
  - 缺点：需要用户在把手处开始拖动（而不是整行任意位置）。
- 放下时“列表闪一下”的问题：`ReorderableListView` 需要在 `onReorder` 里同步更新数据源；如果等待 IO 后再 reload，会导致放下动画结束时整段列表重建，看起来像闪烁。
  - 修复：`onReorder` 内部先 `setState` 更新 `_notes` 顺序，再异步持久化（不强制 reload）。

## 影响文件
- `lib/pages/panel/panel_notes_list.dart`
