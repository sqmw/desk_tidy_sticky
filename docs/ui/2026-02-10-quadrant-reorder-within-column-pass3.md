# 四象限同象限内重排（Pass 3）

## 目标
- 在四象限模式下补齐“同象限内拖拽重排”能力。
- 让看板不仅能跨象限迁移优先级，也能在同象限内微调顺序。

## 本次改动

### 1. 工作台页增加可重排开关
- 文件：`src/routes/workspace/+page.svelte`
- 新增派生条件 `canQuadrantReorder`：
  - `sortMode === custom`
  - 无搜索关键字
  - 当前视图为四象限
- 将 `canQuadrantReorder` 与 `persistReorderedVisible` 传入 `WorkbenchSection`。

### 2. 四象限同列重排逻辑
- 文件：`src/lib/components/panel/WorkbenchSection.svelte`
- 新增：
  - `reorderByAnchor()`：根据锚点卡片与上下半区计算插入位置。
  - `dropToQuadrant()` 分支：
    - 跨象限：保持原逻辑，更新优先级（Q1~Q4）。
    - 同象限：在允许重排条件下调用 `persistReorderedVisible()` 保存顺序。
- 卡片 `draggable` 受 `canQuadrantReorder` 控制，避免非手动排序场景误触。

## 交互结果
- 跨象限拖拽：改变优先级（保持）。
- 同象限拖拽：调整排序（新增）。
- 非手动排序/搜索中：不启用同列重排。

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`
