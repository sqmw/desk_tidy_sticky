# 2026-02-08 贴纸拖拽失败：`setPosition` 权限缺失修复

## 现象
贴纸拖拽时报错：
`setPosition failed window.set_position not allowed`

## 根因
Capability 未授权 `core:window:allow-set-position`，前端自定义拖拽调用 `setPosition` 被 Tauri 拒绝。

## 修复
- 文件：`src-tauri/capabilities/default.json`
- 在 `permissions` 中新增：
  - `core:window:allow-set-position`

## 验证
1. `npm run check` 通过（0 errors / 0 warnings）。  
2. `cargo check` 通过（无新增错误）。
