# 四象限拖拽错位修复：50% 触发 + 方向判定（2026-02-10）

## 回归问题
- 将“50% 覆盖后直接 before”硬编码后，出现整体错位。

## 修正策略
- 保留 50% 覆盖触发条件。
- 覆盖达标后，插入前后由拖动方向决定：
  - 向下拖：插入到目标卡之后
  - 向上拖：插入到目标卡之前
- 通过 `lastGhostCenterY` 跟踪拖拽浮层中心的运动方向。

## 影响文件
- `src/lib/components/panel/WorkbenchSection.svelte`

## 验证
- `npm run check` 通过（0 error / 0 warning）。
