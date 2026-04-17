# 贴纸工具栏滑条点击时超出边界

## 判定

- 这是一个 UI 布局 Bug。
- 问题只出现在点击打开透明度/磨砂滑条时，不是滚轮调节逻辑问题。

## 根因

- `opacity-popover` / `frost-popover` 虽然写了 `left: 50%`，但它们挂在 `.tool-popover-anchor` 这个小按钮容器下面。
- 因此所谓的“居中”实际上是相对单个按钮居中，而不是相对整条工具栏或整张贴纸居中。
- 当按钮靠近左右边界时，118px 的滑条就会溢出贴纸边界。

## 修复

- 将 `.tool-popover-anchor` 改为 `position: static`，让两个滑条 popover 改为相对 `.toolbar` 绝对定位。
- 保持 `left: 50% + translateX(-50%)`，但此时锚点已经变成整条工具栏。
- 增加 `width / max-width` 约束，确保窄窗口下也不会超出贴纸边界。

## 影响文件

- `src/lib/components/note/NoteToolbar.svelte`

## 回归点

1. 点击透明度按钮，滑条应在工具栏水平中间，不得超出贴纸边界。
2. 点击磨砂按钮，滑条应在工具栏水平中间，不得超出贴纸边界。
3. 鼠标滚轮调节时，现有中间显示逻辑保持不变。
