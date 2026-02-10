# Workstation 四象限拖拽体验升级：同尺寸占位落位（2026-02-10）

## 目标
- 对齐简洁模式拖拽体验：拖动时有“同尺寸占位位”，释放后直接落到占位处。

## 实现
1. 占位渲染模型
- 四象限列表从“直接渲染 notes”改为“渲染 items（note + placeholder）”。
- 拖拽中会把被拖拽卡片从列表临时移除，并在目标插入点插入 `placeholder`。

2. 跟手浮层
- 记录被拖拽卡片尺寸和指针偏移：
  - `dragGhostWidth/dragGhostHeight`
  - `dragPointerOffsetX/dragPointerOffsetY`
- `pointermove` 时更新 `dragGhostTop/dragGhostLeft`，渲染固定定位浮层。

3. 落位逻辑
- 松手后按占位位置落位（跨象限改优先级、同象限重排）。
- 保留去重与防重入，避免再次出现重复 key 崩溃。

## 影响文件
- `src/lib/components/panel/WorkbenchSection.svelte`

## 验证
- `npm run check` 通过（0 error / 0 warning）。
