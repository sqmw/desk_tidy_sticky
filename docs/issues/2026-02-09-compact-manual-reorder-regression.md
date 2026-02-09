# 2026-02-09 简洁模式手动排序失效回归修复

## 现象
简洁模式下，选择“手动排序（custom）”后，列表拖动排序无法生效。

## 根因
- 文件：`src/lib/components/panel/NotesSection.svelte`
- `reorder-handle` 位于 `.note-actions` 内部。
- `.note-actions` 对 `pointerdown/pointerup` 做了统一 `stopPropagation`，
  导致拖拽起点事件没有传到 `Dismissible`，纵向拖拽流程无法启动。

## 修复
- 文件：`src/lib/components/panel/NotesSection.svelte`
- 新增 `stopActionPointerIfNotReorder(e)`：
  - 如果事件来自 `[data-reorder-handle="true"]`，不拦截事件。
  - 其他动作按钮仍拦截，避免误触外层交互。

## 验证
1. `npm run check`：通过（0 errors / 0 warnings）
2. `cargo check`：通过（仅既有 warning）

## 经验
当拖拽手柄位于按钮容器内时，事件阻断需要“白名单式放行手柄”，
不能对整组按钮做无差别 `stopPropagation`。
