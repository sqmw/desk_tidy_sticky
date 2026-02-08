# 2026-02-08 贴纸自定义拖拽跟进修复（恢复可拖动）

## 问题
首次切换到自定义拖拽后，贴纸出现“无法拖动”。

## 原因
初版实现依赖屏幕坐标偏移 + RAF 节流链路，透明窗口场景下稳定性不够，导致拖拽状态推进失败。

## 修复
- 文件：`src/routes/note/[id]/+page.svelte`
- 调整为更直接的增量拖拽模型：
  - 按下时读取窗口逻辑坐标作为起点。  
  - `mousemove` 中使用 `movementX/movementY` 累加位移。  
  - 每次移动直接 `setPosition(LogicalPosition)`。  
  - 左键释放自动结束拖拽。

## 结果
贴纸恢复可拖动，同时继续绕开系统 `startDragging`，避免触发 Snap。

## 验证
`npm run check` 通过（0 errors / 0 warnings）。
