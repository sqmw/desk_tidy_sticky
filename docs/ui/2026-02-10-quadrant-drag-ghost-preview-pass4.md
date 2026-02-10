# 四象限拖拽手感优化（Pass 4：Ghost 预览）

## 目标
- 避免浏览器默认拖拽小图标带来的“信息缺失感”。
- 拖拽时提供与真实卡片一致的视觉预览，提升可控感。

## 本次改动
- 文件：`src/lib/components/panel/WorkbenchSection.svelte`
- 在 `dragstart` 时：
  - 克隆当前卡片 DOM 作为 ghost；
  - 使用 `dataTransfer.setDragImage()` 设为拖拽预览；
  - 添加轻微旋转与阴影，增强拖拽状态识别。
- 在 `dragend` 时：
  - 清理临时 ghost 节点，避免泄漏。

## 效果
- 拖拽过程中看到的是“卡片本体预览”，不是系统默认占位图标。
- 与已有落点提示组合后，拖拽路径与落点更直观。

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`
