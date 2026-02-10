# 四象限拖拽反馈优化（Pass 2）

## 目标
- 让四象限视图具备更明确的“拖到哪、将落哪”的可视反馈。
- 拖拽后直接完成优先级迁移（跨象限）。

## 本次改动

### 1. 拖拽状态管理
- 文件：`src/lib/components/panel/WorkbenchSection.svelte`
- 增加状态：
  - `draggingNoteId`
  - `hoverQuadrant`
  - `hoverAnchorId`
  - `hoverBeforeAnchor`

### 2. 落点提示
- 拖拽经过象限时高亮目标象限容器。
- 在卡片上/下半区悬停时显示插入指示条（drop indicator）。
- 空象限时显示空态落点高亮。

### 3. 交互结果
- 在四象限模式下卡片可拖拽。
- 放下时若目标象限与当前象限不同，调用 `updatePriority` 更新优先级（Q1~Q4）。
- 拖拽结束自动清理临时状态。

## 说明
- 本次主要提升“拖拽反馈”和“跨象限迁移”体验。
- 列内严格排序插入（同象限位置重排）暂未引入，避免影响现有全局排序模型。

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`
