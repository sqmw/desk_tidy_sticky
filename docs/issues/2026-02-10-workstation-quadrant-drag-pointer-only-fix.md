# Workstation 四象限拖拽失效修复（pointer-only，2026-02-10）

## 现象
- 四象限卡片在 workstation 中“仍然拖不动”。

## 根因
- 同时存在两条拖拽链路：
  - 原生 HTML5 `drag/drop`
  - Pointer 拖拽兜底
- 在 WebView 场景下两条链路会抢事件，导致拖拽状态不稳定或直接失效。

## 修复方案
- 四象限改为单一链路：`pointer-only`。
- 通过拖拽手柄 `pointerdown` 启动拖拽，记录 `pointerId` 并 `setPointerCapture`。
- `pointermove` 期间通过 `elementFromPoint` 实时计算：
  - 当前目标象限
  - 卡片前/后插入锚点
- `pointerup` 时统一完成落位：
  - 跨象限：更新优先级
  - 同象限：按锚点重排

## 影响文件
- `src/lib/components/panel/WorkbenchSection.svelte`

## 验证
- `npm run check` 通过（0 error / 0 warning）。
