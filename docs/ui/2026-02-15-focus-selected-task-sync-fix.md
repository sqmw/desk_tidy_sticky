# 2026-02-15 当前专注任务无法切换修复

## 背景
- 现象：在 `专注任务规划` 列表点击 `开始` 或在番茄钟任务下拉切换后，`当前专注任务` 会回到旧任务，表现为“不能设置/不能修改”。
- 触发场景：常规场景可复现；在“今日无匹配任务，展示全部任务”场景更明显。

## 根因
- `WorkspaceFocusHub` 中父子同步逻辑存在竞争：
  - 子组件本地先更新 `selectedTaskId`。
  - 父组件回写值尚未更新时，子组件的“读取父值” effect 立即用旧值覆盖本地新值。
- 命令分发校验仍基于 `todayTasks`，在“展示全部任务”模式下会拦截合法 taskId。

## 修复方案
### 1) 选中任务同步防抖（避免旧值回灌）
- 文件：`src/lib/components/workspace/WorkspaceFocusHub.svelte`
- 调整：父值同步 effect 增加保护条件。
  - `next` 为空或等于当前值时不处理。
  - `next === lastSyncedSelectedTaskId`（父级旧回显）时跳过，避免覆盖本地最新选择。

### 2) 命令任务校验改为当前可选集合
- 文件：`src/lib/components/workspace/WorkspaceFocusHub.svelte`
- 调整：命令处理中的任务存在性判断从 `todayTasks` 改为 `focusSelectableTasks`。
- 效果：在 fallback 展示全部任务时，`select/start` 指令同样可生效。

## 验证
- 执行：`npm run check`
- 结果：通过（0 error / 0 warning）。

## 风险与兼容性
- 改动仅影响任务选择同步与命令校验，不改变任务数据结构与存储格式。
- 保持与现有架构一致：状态仍由 `WorkspaceFocusHub` 与父级通过 `onSelectedTaskIdChange` 单向回写协同。
