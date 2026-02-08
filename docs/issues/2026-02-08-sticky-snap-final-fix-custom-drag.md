# 2026-02-08 贴纸窗口 Snap 最终修复：改为自定义拖拽

## 问题
贴纸窗口即使禁用了 `resizable/maximizable`，在 Windows 上仍可能因系统拖拽通道触发 Snap。

## 根因
贴纸拖动使用 `window.startDragging()`，属于系统窗口移动流程。  
Windows 会在该流程中应用 Snap 逻辑，样式层禁用并非所有场景都完全拦截。

## 修复方案
- 文件：`src/routes/note/[id]/+page.svelte`
- 将贴纸拖动实现从 `startDragging()` 改为前端自定义移动：
  1. 鼠标按下时读取窗口当前位置与缩放比例，记录拖拽偏移。  
  2. `mousemove` 中通过 `setPosition(new LogicalPosition(x, y))` 连续移动窗口。  
  3. `mouseup` 时结束拖拽并清理监听与 `requestAnimationFrame` 状态。  

## 结果
贴纸拖动不再走系统 Snap 通道，拖到屏幕边缘不会触发 Aero Snap。

## 验证
1. `npm run check` 通过（0 errors / 0 warnings）。  
2. `cargo check` 通过（无新增错误）。
