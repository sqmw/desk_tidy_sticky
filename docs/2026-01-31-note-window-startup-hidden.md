# Note Window 启动被隐藏（需点一次“鼠标交互”才显示）

## 现象
- 方案C（每贴纸一个窗口）下：
  - 启动时即使已开启桌面贴纸，窗口仍不显示
  - pin 新贴纸后也不显示
  - 需要点一次“鼠标交互”才会显示

## 根因
- `lib/main.dart` 的 `waitUntilReadyToShow` 逻辑默认将“非 overlay”窗口启动后 `hide()`，
  该逻辑原本只针对 Panel 窗口（依赖托盘/热键显示）。
- Note window 也会走到这段逻辑，被启动时隐藏，从而看起来“没有反应”。
- 点击“鼠标交互”会触发后续 `showNoActivate` / z-order 更新，使窗口再次显示。

## 修复
- 仅对 `AppMode.normal`（Panel）执行启动隐藏。
- `AppMode.note` 不再启动隐藏，也不初始化托盘/热键。

## 影响文件
- `lib/main.dart`
