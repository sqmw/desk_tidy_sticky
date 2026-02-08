# 2026-02-07 置顶/置底图标美化

## 背景
主窗口便签列表中的“置顶/置底”按钮原先使用字符 `▴/▾`，与整体图标体系不一致，视觉上较突兀。

## 修改
- 文件：`src/lib/components/panel/NotesSection.svelte`
- 改动：
  - 将 `▴/▾` 替换为统一的矢量图标（Material 风格）：
    - `iconLayerTop`（置顶）
    - `iconLayerBottom`（置底）
  - 增加样式：
    - `.action-btn.zorder-toggle`
    - `.zorder-icon`

## 效果
- 图标风格与其它操作按钮统一。
- 状态语义更直观（顶部/底部层级）且不影响原有交互逻辑。

## 验证
- `npm run build` 通过。
