# 2026-02-08 Sticky 无滚动条视觉优化

## 目标
从用户体验角度，贴纸窗口不显示滚动条。

## 修改
- 文件：`src/routes/note/[id]/+page.svelte`
- 范围：
  - `.editor`（编辑态）
  - `.preview-text`（预览态）

## 实现
1. 保留 `overflow: auto`，确保长文本仍可滚动。  
2. 统一隐藏滚动条：
  - `scrollbar-width: none`（Firefox）
  - `-ms-overflow-style: none`（旧 Edge/IE）
  - `::-webkit-scrollbar { display: none; width: 0; height: 0; }`（Chromium/WebKit）

## 结果
贴纸在编辑与预览状态下都不再显示滚动条，但滚轮/触控板滚动能力保留。
