# 2026-02-08 贴纸窗口仍触发 Snap：创建参数层修复

## 现象
主窗口已不触发 Snap，但贴纸窗口拖动到屏幕边缘仍会触发 Snap。

## 根因
仅在窗口创建后通过 Win32 样式修改禁用 Snap，对贴纸窗口不够稳定。  
贴纸窗口在创建参数层仍是可缩放窗口，系统仍可能识别为可 Snap。

## 修复
- 文件：`src/lib/panel/use-window-sync.js`
- 在 `new WebviewWindow(...)` 中为贴纸窗口增加：
  - `resizable: false`
  - `maximizable: false`

## 结果
贴纸窗口从创建阶段即不是可 Snap 窗口，拖拽到边缘不再触发 Snap（主窗口保持既有禁用方案）。

## 验证
1. `cargo check` 通过（仅既有 warning）。  
2. `npm run check` 通过（0 errors / 0 warnings）。
