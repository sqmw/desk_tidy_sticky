# Workstation 四象限：占位错位与拖拽浮层空内容修复（2026-02-10）

## 问题
- 占位空白块在底部/滚动区域位置不准确。
- 跟手拖拽浮层没有展示当前卡片内容，只有空白外观。

## 修复
1. 占位位置计算
- 改为基于象限列表容器坐标计算插入索引：
  - 使用 `pointerYInList = clientY - listRect.top + list.scrollTop`
  - 对每个卡片使用 `offsetTop + offsetHeight / 2` 判断插入位置
- 解决滚动容器内“看着在 A，实际落在 B”的偏差。

2. 拖拽浮层内容
- 浮层改为真实卡片信息：
  - 优先级标签
  - 更新时间
  - 正文渲染内容（截断显示）
- 提升拖拽过程的空间感和可预期性。

## 影响文件
- `src/lib/components/panel/WorkbenchSection.svelte`

## 验证
- `npm run check` 通过（0 error / 0 warning）。
