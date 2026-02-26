# 2026-02-26 Windows 隐藏 WORKSPACE 英文标记

## 判定
- 类型：`设计调整`
- 目标：Windows 端侧栏顶部不显示 `WORKSPACE` 英文标记，仅保留主标题与副标题。

## 变更
- `WorkspaceSidebar` 中将 `brand-pill` 渲染改为仅 macOS 显示：
  - `isMac === true` 时显示（保留 mac 交通灯相关布局联动）
  - Windows/其他平台不显示

## 影响文件
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceSidebar.svelte`

## 回归验证
1. Windows 打开工作台，侧栏顶部不再显示 `WORKSPACE` 英文标记。
2. macOS 打开工作台，顶部行为保持原有（交通灯占位联动不变）。
