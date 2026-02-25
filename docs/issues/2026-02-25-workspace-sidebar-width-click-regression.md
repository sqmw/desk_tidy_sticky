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
