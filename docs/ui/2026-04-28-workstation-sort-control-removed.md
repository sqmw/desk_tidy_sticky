# Workstation 排序入口下线

## 背景

Workstation 侧边栏此前暴露了笔记排序入口：

- 手动
- 最新
- 最早

但当前这组排序行为并没有形成完整、可验收的工作台能力，继续显示会误导用户，以为工作台里已经支持可用的排序切换。

## 判定

这是一个 `Bug或回归`：

- UI 已经暴露
- 但对应能力未完成
- 会造成“有入口、无可靠行为”的错误预期

## 处理策略

本轮先做最小收口：

- 只移除 workstation 里的排序入口
- 不改动底层 `sortMode` 偏好字段
- 不影响 mini 模式和现有数据读写链路

这样可以先消除误导性入口，同时避免因为一次 UI 下线去联动重构共享偏好状态。

## 代码范围

- `src/routes/workspace/+page.svelte`
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
- `src/lib/components/workspace/sidebar/WorkspaceSidebarNoteFilters.svelte`

## 结果

修改后 workstation 侧边栏的笔记过滤区不再显示：

- 排序标签
- 排序下拉框

保留的仍然是：

- 视图切换
- 初始视图
- 标签过滤

## 后续

如果后面要重新支持 workstation 排序，需要先明确：

1. 它是 workstation 独立排序，还是和 mini 共享排序
2. 手动 / 最新 / 最早 三种行为的真实数据语义
3. 排序切换对拖拽顺序、创建顺序、标签过滤和 inspector 行为的影响
