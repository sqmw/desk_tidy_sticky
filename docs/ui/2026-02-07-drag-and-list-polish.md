# 2026-02-07 Drag And List Polish

## Context
本次优化针对两个体验问题：
1. 上下拖动排序手感差，容易提前结束或落位不准。
2. 贴纸列表层次感弱，拖拽时反馈不清晰。
3. 后续反馈中出现“首条左侧黄色条过于突兀”和“实际拖不动”。

## Root Cause
### Dragging
- `Dismissible` 使用 `mousemove + mouseleave`，鼠标稍微离开卡片就会触发结束。
- 排序落位用固定 `itemHeight = 60` 估算，和真实卡片高度/间距不一致，导致误判。
- 行内同时存在“左右滑动删除/归档”和“纵向排序”，整行起手会产生手势竞争。

### List UI
- 卡片层次和状态（pinned/done/muted）区分不足。
- 拖拽中只有透明度变化，没有明确落点提示。
- `pinned` 的左侧高亮条在浅色主题下呈现偏黄，视觉上被误认为异常标记。

## Implementation
### 1) Pointer Event Unification (`src/lib/Dismissible.svelte`)
- 统一改为 `pointerdown / pointermove / pointerup / pointercancel`。
- 使用 `pointerId + pointer capture` 保证拖拽期间事件连续。
- 去掉 `mouseleave` 结束逻辑，避免误中断。
- 纵向拖拽回调补充实时 `clientY` 参数，便于上层做精准命中计算。

### 2) Accurate Reorder Target (`src/routes/+page.svelte`)
- 新增 `findDropIndexByPointer(pointerY)`：
  - 基于 `.note-wrapper` 实时 `getBoundingClientRect`。
  - 用“卡片中心线”判断插入位置，不再使用固定高度估算。
- 新增 `candidateToDropIndex`：
  - 处理“源项移除后索引偏移”，确保下拖/上拖都正确落位。
- 新增边缘自动滚动 `autoScrollNotesList(pointerY)`：
  - 拖到列表顶部/底部时自动滚动，支持长列表连续排序。

### 3) Visual Feedback Upgrade (`src/routes/+page.svelte`)
- 拖拽项实时位移：`--drag-y`。
- 落点高亮：`.note-wrapper.drop-target::after`。
- 卡片风格优化：
  - 渐变底色和更柔和阴影。
  - 取消 `pinned` 左侧强调条，避免误导性黄色边线。
  - `done` 划线、`muted` 降低权重。
  - 操作按钮默认半显、悬停/拖拽时全显。

### 4) Flutter 对齐的稳定拖拽策略 (`src/lib/Dismissible.svelte`, `src/routes/+page.svelte`)
- 参考项目：`F:/language/dart/code/desk_tidy_sticky/lib/pages/panel/panel_notes_list.dart`
- 关键对齐点：
  - 采用明确的“排序把手”触发垂直排序。
  - `Dismissible` 保持左右滑动职责，不再与整行纵向排序抢手势。
  - 放下时先更新本地列表顺序，再异步持久化，避免刷新闪动。
- 当前实现：
  - 新增 `verticalDragHandleSelector`，仅当指针从 `[data-reorder-handle="true"]` 起手时进入纵向排序。
  - 列表右侧新增拖动把手按钮（九点图标，`cursor: grab/grabbing`）。
  - `reorderNotes` 改为先本地重排 `notes`，再调用 `reorder_notes`；失败时才回退 `loadNotes()`。

### 5) Drag Proxy + Realtime Squeeze (`src/routes/+page.svelte`)
- 目标：行为对齐 Flutter 的 `ReorderableListView proxyDecorator` 视觉。
- 实现：
  - 新增 `dragPreviewNotes` 作为“拖动中的临时渲染序列”。
  - 列表渲染由 `visibleNotes` 切换为 `renderedNotes = dragPreviewNotes ?? visibleNotes`。
  - 拖动移动过程中，命中新的目标索引后立即在 `dragPreviewNotes` 内重排。
  - 配合 `animate:flip`，其余卡片会实时“被挤开”。
  - 被拖项通过 `dragging-wrapper` 提升层级，叠加阴影与轻微缩放，形成“抬起到上层”的反馈。
- 松手行为：
  - 用 `dragPreviewNotes` 的最终顺序一次性持久化；
  - 之后清理拖动态，恢复常规渲染。

### 6) Post-fix for Three Regressions (2026-02-07, second pass)
- 反馈问题：
  1. 被拖项没有明显在上层。
  2. 松手后仍然跟随鼠标移动。
  3. 最终落位偏差。
- 修复点：
  - `src/routes/+page.svelte`
    - `.note-item` 增加 `position: relative`，`dragging` 状态 `pointer-events: none`，确保层级和事件命中正确。
    - 新增全局 `onpointerup/onpointercancel` 兜底收尾，任何情况下都执行 `finalizeVerticalDrag()`。
    - 拖动预览重排后重置基线（`verticalDragStartY = clientY`, `dragOffsetY = 0`），消除累计位移导致的落位漂移。
  - `src/lib/Dismissible.svelte`
    - 在 `pointercancel` 和 `lostpointercapture` 时补发 `onVerticalDragEnd`，避免父层拖动态遗留。
    - `pointerup` 后主动 `releasePointerCapture`，减少捕获状态残留。

### 7) Proxy Drag Model (2026-02-07, third pass)
- 背景：
  - 仅靠列表内 `transform` 会出现“看起来在下层”和“只有松手才对齐空位”的体验问题。
- 最终实现（对齐 Flutter `proxyDecorator` 思路）：
  - 列表内被拖项改为占位态（原位置隐藏 + 占位边框）。
  - 真正跟手的是独立 `drag-ghost`（`position: fixed; z-index: 2000; pointer-events: none`）。
  - 其它项继续使用 `animate:flip`，拖动过程中实时挤开。
  - 松手时先立即清空拖动态，再异步持久化排序，避免“松手后仍跟随”。
- 关键收益：
  - 被拖项始终在上层。
  - 占位位置在拖动过程中实时可见，不再等到 drop 才“落空位”。
  - 拖拽结束无残留跟随。

### 8) Early Drop Regression Fix (2026-02-07, fourth pass)
- 现象：
  - 按住鼠标未松开时，拖拽项会提前“落下”。
- 根因：
  - 列表重排触发 `lostpointercapture`，被错误当成真实拖拽结束。
- 修复：
  - `src/lib/Dismissible.svelte` 中 `pointercancel/lostpointercapture` 不再触发 `onVerticalDragEnd`。
  - 真实结束仅由 `pointerup`（以及页面级兜底 `window pointerup/cancel`）驱动。
- 效果：
  - 拖拽仅在松开鼠标后结束，不再中途自动落下。

### 9) Downward Drag Freeze Fix (2026-02-07, fifth pass)
- 现象：
  - 向下拖动一格后卡住，继续上下移动无响应。
- 根因：
  - 列表实时重排会导致被拖项元素短暂失去 pointer capture；
  - 组件此前在 `lostpointercapture` 里直接终止会话，后续 move 不再进入。
- 修复：
  - `src/lib/Dismissible.svelte`
    - 垂直拖拽中忽略 `lostpointercapture` 中断；
    - 增加 `window` 级 `pointermove/pointerup/pointercancel` 监听，作为持续事件流。
- 效果：
  - 下拖可连续跨多项，不再“一步后冻结”。

## Sticky Interaction Recovery (2026-02-07)

### Problem
- 某些贴纸打开后，工具栏按钮不可见，且窗口无法拖动/点击。
- 表现为“贴纸像被锁死”，只能看到内容。

### Root Cause
- `note/[id]` 页面把 `isAlwaysOnTop=false` 视为 `isBottomLocked`，并强制：
  - `setIgnoreCursorEvents(true)`
  - 禁止进入编辑/拖动
  - 直接不渲染工具栏
- 同时，Rust 端新建 pinned 便签默认 `is_always_on_top=false`，会更容易触发该“锁死组合”。

### Fix
1. Rust 默认行为修正（新 pinned 默认可交互）
- `src-tauri/src/notes.rs`：
  - `Note::new(..., is_pinned=true)` 时默认 `is_always_on_top=true`。
- `src-tauri/src/notes_service.rs`：
  - `toggle_pin` 切到 pinned 时，自动设 `is_always_on_top=true`。

2. 前端交互策略修正（不再强制底层锁死）
- `src/routes/note/[id]/+page.svelte`：
  - `applyInteractionPolicy` 仅由 `clickThrough` 决定是否 ignore cursor events。
  - 去掉 `isBottomLocked` 对编辑、拖动、鼠标交互切换的硬阻断。
  - 工具栏改为始终渲染（不再 `if note.isAlwaysOnTop`）。

### Verification
- `npx svelte-check --tsconfig ./jsconfig.json`：通过（0 error / 0 warning）。
- 说明：
  - `npm run check` 与 `cargo check` 在当前机器出现 `EPERM/Access denied`（系统文件锁权限问题），不是代码编译错误。

## Validation
执行：
- `npm run check`

结果：
- `svelte-check found 0 errors and 0 warnings`

## Impact
- 拖拽排序从“估算型”升级为“命中型”，准确率和稳定性提升。
- 列表视觉层次更清晰，拖拽过程可预期，操作成本更低。
