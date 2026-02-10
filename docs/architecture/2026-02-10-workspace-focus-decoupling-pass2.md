# Workspace Focus 解耦（Pass 2）

## 目标
- 降低 `WorkspaceFocusHub.svelte` 的职责密度。
- 将“可复用业务逻辑”从组件中抽离到独立 runtime 模块。

## 本次改动

### 1. 新增 Focus Runtime
- 新文件：`src/lib/workspace/focus/focus-runtime.js`
- 抽离内容：
  - 番茄阶段常量与周枚举：`PHASE_*`, `FOCUS_WEEKDAYS`
  - 配置归一化：`getSafeConfig`
  - 阶段时长与阶段推进：`getPhaseDurationSec`, `nextPhaseState`, `phaseLabel`
  - 任务/统计写入逻辑：
    - `toggleTaskDoneInStats`
    - `removeTaskFromState`
    - `applyFocusCompleted`
    - `buildFocusTaskFromDraft`
  - 展示聚合逻辑：
    - `buildTodaySummary`
    - `buildTimerTaskOptions`

### 2. WorkspaceFocusHub 组件瘦身
- 文件：`src/lib/components/workspace/WorkspaceFocusHub.svelte`
- 调整：
  - 删除组件内重复的阶段/统计计算与任务变更实现，改为调用 runtime。
  - 保留 UI 编排与事件接线，组件职责更清晰。
  - 统一 `view + state` 的依赖路径，减少后续扩展时改动面。

## 架构收益
- 业务逻辑从 UI 框架中解耦，后续可单测/复用。
- 组件可读性提升，后续再加“专注策略/统计口径”不会继续堆在视图文件里。
- 更符合单一职责和低耦合目标。

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`
