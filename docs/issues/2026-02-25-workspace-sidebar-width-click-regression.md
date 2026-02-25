# Workspace Sidebar Width Click Regression (2026-02-25)

## 判定
- 类型：`Bug/回归`

## 现象
- 侧边栏宽度分隔条在未拖动时，仅点击就会触发宽度变化（常见为突然变窄）。

## 根因
- `sidebar` 分隔条在 `pointerup` 阶段无条件执行 `applySidebarResize(event.clientX)`。
- 即使用户没有真实拖拽，点击抬起时的坐标也会被当作目标宽度写入，导致“单击即缩放”。

## 历史对比（按用户要求）
- 对比历史版本 `804cf54` 中同文件实现：
  - `onWindowPointerMove` 直接按坐标实时更新；
  - `onWindowPointerUp` 也无条件再次写入宽度。
- 现象在旧实现已存在，本次通过阈值与按键守卫做了行为层修复，避免“点击误触发缩放”。

## 修复策略
- 为侧边栏缩放引入“拖拽启动阈值”机制：
  - 记录 `pointerdown` 时的起点坐标与起始宽度；
  - 只有横向位移超过阈值后，才判定为真实拖拽并执行缩放；
  - 未达到阈值时 `pointerup` 直接还原起始宽度，不触发缩放。
- 增加 `pointermove` 按键状态守卫：
  - 仅在左键仍按下（`event.buttons & 1`）时处理侧栏宽度更新；
  - 忽略释放后可能出现的合成/抖动移动事件。

## 代码变更
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/resize-controller.js`
  - 新增阈值常量：`SIDEBAR_DRAG_START_THRESHOLD = 8`
  - 新增状态：`sidebarDragStartX` / `sidebarDragStartWidth` / `sidebarDraggingStarted`
  - `startSidebarResize` 记录起始状态
  - `onWindowPointerMove` 先判定左键状态，再判定阈值，达到后才执行 `applySidebarResize`
  - `onWindowPointerUp` 在未进入拖拽时恢复起始宽度，避免点击回归

## 回归验证
1. 在分隔条上单击，不拖动。
2. 期望：侧栏宽度保持不变。
3. 按住分隔条水平拖动并释放。
4. 期望：侧栏宽度按拖动变化，拖动逻辑与折叠阈值保持原行为。

## Follow-up: Right-Side ~20px Misalignment (2026-02-25)
- 输入证据:
  - 用户反馈在侧边栏右侧约 `20px` 区域出现拖拽识别/边界错位。
- 判定:
  - `Bug/回归`。
- 根因:
  - 工作台容器使用 `transform: scale(var(--ws-ui-scale))`。
  - 旧逻辑直接用屏幕坐标 `clientX` 计算侧栏宽度，未转换回未缩放的设计坐标，导致边界随缩放发生偏移。
- 修复:
  - 新增侧栏坐标映射钩子 `mapSidebarPointerClientX`，在进入宽度计算前先按 `uiScale` 反算。
  - 计算公式：`(clientX - viewportLeft) / uiScale`。
- 调整文件:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/resize-controller.js`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/workspace/+page.svelte`

## Follow-up: Resize Cursor Not Showing (2026-02-25)
- 输入证据:
  - 用户反馈鼠标移动到侧栏宽度拖动条时，光标未显示为拖拽指示。
- 判定:
  - `Bug/回归`
- 根因:
  - 分隔条视觉宽度仅 `8px`，命中区域依赖伪元素外扩，hover 命中在不同区域不稳定。
  - 结果是“按住拖动时逻辑可触发，但常规悬停不稳定显示拖拽光标”。
- 修复:
  - 将分隔条改为“真实可命中的宽 hitbox + 细视觉线”：
    - `sidebar-splitter` 设为固定命中宽度（`30px`），并 `justify-self: center` 跨越边界两侧。
    - 使用 `::before` 提供透明但可命中的覆盖层，保证 hover 命中稳定。
    - 使用 `::after` 渲染细视觉线，hover 时仅增强视觉反馈，不改变命中层。
- 调整文件:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/workspace/+page.svelte`

## Follow-up: Inspector Splitter Hit Area Regression (2026-02-25)
- 输入证据:
  - 用户反馈笔记列表与详情面板之间的竖向分割条，命中与光标反馈不稳定，表现与此前侧栏分割条问题一致。
- 判定:
  - `Bug/回归`
- 根因:
  - 分割条可视宽度仅 `8px`，命中依赖窄区域，hover/拖拽触发不稳定。
- 修复:
  - 将 `inspector-splitter` 改为“宽命中区 + 细视觉线”：
    - 命中宽度 `30px`，并 `justify-self: center` 保持视觉线位于原分割位。
    - `::before` 作为透明命中层，稳定 hover 与拖动触发。
    - `::after` 仅作为视觉线反馈，hover 时高亮，不参与命中。
- 调整文件:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/workspace/+page.svelte`

## Follow-up: Inspector Click Shrinks Width by ~20px (2026-02-25)
- 输入证据:
  - 用户反馈详情分割条“点击即右侧宽度收缩约 20px”，与此前侧栏回归现象一致。
- 判定:
  - `Bug/回归`
- 根因:
  - `inspector` 路径仍是 `pointerup` 无条件执行 `applyInspectorResize`，单击也会被识别成一次有效缩放。
  - `workspace` 使用 `transform: scale(...)`，`inspector` 旧路径未做坐标映射，导致宽度按缩放坐标写入，出现固定量级偏移（约 20px）。
- 修复:
  - 为 `inspector` 分割条补齐与侧栏一致的拖拽防抖机制：
    - 新增拖拽启动阈值，单击不触发宽度变更；
    - `pointermove` 增加左键状态守卫，忽略释放后的抖动事件。
  - 为 `inspector` 补齐缩放坐标映射：
    - `mapInspectorPointerClientX` 将 `clientX` 反算到未缩放坐标；
    - `mapInspectorRect` 将 `workbenchShellRect` 同步映射到未缩放坐标；
    - 使 `calcInspectorLayout` 的输入统一在同一坐标系中。
- 调整文件:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/resize-controller.js`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/workspace/+page.svelte`
