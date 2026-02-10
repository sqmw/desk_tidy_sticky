# Workstation 四象限占位位置偏差修复（2026-02-10）

## 问题
- 拖拽时占位空白块位置不准确，常出现“在错误行/错误区域插入”的体验问题。

## 原因
- 旧逻辑使用锚点推断（`hoverAnchorId + before/after`）作为占位位置来源，边界情况下会偏移。

## 修复
- 改为按指针实时计算插入索引（`hoverInsertIndex`）：
  - 在当前象限内收集所有可排序卡片（排除被拖拽卡片）。
  - 按 `pointerY` 与每张卡片中心点比较得到目标插入索引。
  - 占位块渲染、最终落位都统一使用该索引。

## 结果
- 占位块位置与指针更一致，松手落位与看到的空白位置一致。

## 影响文件
- `src/lib/components/panel/WorkbenchSection.svelte`

## 验证
- `npm run check` 通过（0 error / 0 warning）。
