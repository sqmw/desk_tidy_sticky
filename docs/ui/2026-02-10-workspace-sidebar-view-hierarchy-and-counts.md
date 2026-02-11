# Workspace 左侧视图层级与计数优化

日期：2026-02-10  
范围：`workspace` 左侧导航（仅笔记模块）

## 背景
- 左侧“笔记视图”平铺展示时信息密度高，可读性一般。
- 用户在切换时无法快速感知各视图当前内容规模。

## 改动点
### 1) 视图主次分层
- 在“笔记”模块下将视图拆分为两层：
  - 主要视图：`全部`、`待办`、`四象限`
  - 次级视图：`已归档`、`回收站`
- 两层之间增加分隔线，减少视觉混杂。

### 2) 视图计数徽标
- 每个视图按钮右侧增加数量徽标，帮助快速判断工作量。
- 计数规则：
  - `全部`：未归档且未删除
  - `待办`：未归档且未删除且未完成
  - `四象限`：未归档且未删除
  - `已归档`：已归档且未删除
  - `回收站`：已删除

### 3) 实现说明
- 在 `src/routes/workspace/+page.svelte` 增加 `noteViewCounts` 派生状态；
- `WorkspaceSidebar` 只消费计数，不承担业务计算；
- 保持原有数据模型与接口不变，降低耦合风险。

## 涉及文件
- `src/routes/workspace/+page.svelte`
- `src/lib/components/workspace/WorkspaceSidebar.svelte`

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`
