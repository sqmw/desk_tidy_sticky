# 2026-03-28 Workspace 专注任务“有效时长模型”设计

## 判定
- 类型：`设计调整`
- 触发原因：
  1. 当前 `番茄任务` 的核心统计仍然是 `番茄次数`，并不等价于“任务已经实际投入了多少有效时间”。
  2. 用户现在需要支持两类任务：
     - 仅有时长要求，不限定具体时间窗。
     - 有明确时间窗，但完成判定依然按“当天累计有效时长是否达标”。
  3. 因此任务模型需要从“番茄归属对象”升级为“有效工作时长目标对象”。

## 当前实现（设计前现状）

### 现有任务模型
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-model.js`
- 当前 `FocusTask` 只包含：
  - `title`
  - `startTime`
  - `endTime`
  - `recurrence`
  - `weekdays`
  - `enabled`
  - `createdAt`

### 现有统计模型
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-model.js`
- 当前 `FocusDayStats` 只包含：
  - `focusSeconds`
  - `pomodoros`
  - `completedTaskIds`
  - `taskPomodoros`

### 当前计时语义
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-runtime.js`
- 现状：
  1. 完成一次番茄时，才会累计：
     - 今日总专注秒数 `focusSeconds`
     - 今日番茄数 `pomodoros`
     - 当前任务番茄数 `taskPomodoros[taskId]`
  2. 任务本身没有：
     - 今日有效累计时长
     - 历史累计时长
     - 当前 session 已用时长
  3. 所以当前系统仍然是“番茄钟在计时”，不是“任务在计有效工时”。

## 新边界

### 核心原则
1. `番茄钟` 只负责专注 session 的运行控制。
2. `专注任务` 负责定义目标与累计有效时长。
3. 任务完成判定以“有效时长是否达标”为主，不再以番茄次数为主。
4. `🍅 次数` 保留为辅助统计，不再充当完成语义。

### 任务类型
专注任务收敛为两类：

1. `duration`
   - 含义：仅有目标时长，不限制今天具体开始/结束时刻。
   - 示例：`看英语 2 小时`

2. `timeWindow`
   - 含义：有时间窗，但完成判定仍按“当天累计有效时长是否达到该时间窗长度”。
   - 示例：`14:00-16:00 做 leetcode`

## 统一完成模型

### 统一目标时长
两类任务最终都统一为一个字段：
- `targetSeconds`

推导规则：
1. `duration`
   - `targetSeconds = 用户配置的目标时长`
2. `timeWindow`
   - `targetSeconds = endTime - startTime`

这意味着：
- `timeWindow` 任务本质上也是“目标时长任务”
- `startTime/endTime` 更多承担：
  - 展示
  - 时间规划
  - 时间线分布
  - 今日排序

而不是直接决定“只有在这个时间窗内计时才有效”

## 有效计时规则

### 计入原则
只有以下时间计入任务有效时长：
1. 用户显式点击了该任务的 `开始`
2. 当前任务处于 `running = true`
3. 计时器处于有效专注态，不是休息态

### 不计入原则
以下时间不计入：
1. 暂停后的时间
2. 休息 overlay / 小休 / 长休时间
3. 未选中任务但单纯打开工作台的停留时间

### 时间窗型任务的边界
`timeWindow` 任务不做“超出时间窗就不再记时”的硬限制。

原因：
1. 用户已明确给出产品规则：即使超出设定时间范围，只要点击开始并累计有效时间，仍然应算进当日投入。
2. 真正的完成标准是：
   - 当天累计有效时长 `>= endTime - startTime`

所以：
- 时间窗约束的是“计划长度”
- 不是“可计时窗口硬裁剪”

## 新数据模型

### FocusTask（目标模型）
建议新增或收敛为以下字段：

```js
{
  id: string,
  title: string,
  taskMode: "duration" | "timeWindow",
  targetSeconds: number,
  startTime: string,
  endTime: string,
  recurrence: "none" | "daily" | "workday" | "custom",
  weekdays: number[],
  enabled: boolean,
  createdAt: string
}
```

说明：
1. `duration`
   - `startTime/endTime` 可为空，或保留为默认展示字段但不参与完成判定。
2. `timeWindow`
   - `targetSeconds` 由 `endTime - startTime` 直接推导并写入。

### FocusDayStats（按天累计）
建议补充：

```js
{
  focusSeconds: number,
  pomodoros: number,
  completedTaskIds: string[],
  taskPomodoros: Record<string, number>,
  taskEffectiveSeconds: Record<string, number>
}
```

新增字段说明：
- `taskEffectiveSeconds[taskId]`
  - 记录某天该任务已经累计的有效时长

### Runtime（运行态）
运行态需要能表达“本次 session 已走多久”：

```js
{
  selectedTaskId: string,
  running: boolean,
  hasStarted: boolean,
  taskTimingActive: boolean,
  sessionStartedAtTs: number
}
```

其中：
1. `sessionStartedAtTs`
   - 当前这次开始的起点
2. `taskTimingActive`
   - 任务有效时长是否正在累计
   - 不再简单依赖顶部番茄 `running`
2. 暂停时：
   - 把 `now - sessionStartedAtTs` 累加进 `taskEffectiveSeconds`
   - 然后清零 `sessionStartedAtTs`

## 2026-03-28 运行态规则收敛（三）：任务主语义

### 判定
- 类型：`设计调整`
- 触发原因：
  1. 用户要求“任务只要是开始状态就要计时”，这比“顶部番茄是否在 running”更强。
  2. 旧实现里 `taskSessionStartedAtTs` 的恢复条件错误地依赖 `running && restoredFocusRemaining > 0`，导致任务开始态在刷新/恢复后可能丢失。
  3. 休息控制到点时，旧实现只会弹出休息提醒，但不会先结算并暂停当前任务 session。

### 当前规则
1. 同一时刻最多只能有一个任务处于有效计时态。
2. 点击某个任务的 `开始`：
   - 若已有其他任务在计时，先结算并暂停旧任务。
   - 再切换到新任务并开启新的 `taskSessionStartedAtTs`。
3. 点击当前任务的 `暂停`：
   - 立即结算本次 session 到 `taskEffectiveSeconds`。
   - 停止顶部专注倒计时，同时保留当前任务为“已开始但已暂停”。
4. 休息控制到点进入 `mini / long break`：
   - 先结算当前任务 session。
   - 再暂停任务有效计时与顶部专注倒计时。
   - 休息结束后不自动恢复，需要用户显式继续。
5. 任务运行态会写入 runtime cache：
   - `selectedTaskId`
   - `hasStarted`
   - `taskTimingActive`
   - `taskSessionStartedAtTs`
   这样在前端刷新或窗口重建后，不会因为顶部番茄状态恢复失败而把任务计时态清空。

### 代码落点
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 新增 `taskTimingActive`
  - 新增 `pauseActiveTaskSession()`
  - `startTaskFocus()` 改为“先暂停旧任务，再开始新任务”
  - `applyBreakNow()` 改为“先结算并暂停当前任务，再进入休息”
  - runtime restore/persist 改为以 `taskTimingActive` 作为任务计时恢复依据
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-timer-runtime-cache.js`
  - 增加 `taskTimingActive` 字段持久化

### 回归验证重点
1. 开始任务 A，等待若干秒，刷新页面后 `已累计` 继续增长，不丢失 session。
2. 开始任务 A 后再点任务 B，A 先停止累计，B 开始累计，不会并行。
3. 休息控制到点后，当前任务立刻停止累计；休息结束后不会自动偷偷继续。
4. 任务行按钮状态：
   - 运行中：`暂停`
   - 已暂停：`继续`
   - 未开始：`开始`

## 任务完成判定

### 当天达标
默认采用“当天累计”规则：

1. `duration`
   - `todayTaskEffectiveSeconds >= targetSeconds`
2. `timeWindow`
   - `todayTaskEffectiveSeconds >= targetSeconds`
   - 其中 `targetSeconds = endTime - startTime`

### 为什么默认看“当天累计”
因为你当前给的规则明显是按“今日任务”在运作：
1. `时间窗型任务` 目标就是今天这段计划时长。
2. 你说的是“当天花费的时间只要不小于 ... 即可”。

所以首版不建议引入“跨天累计完成”。

## UI 口径

### 任务列表
启动过的任务必须显示“已经完成了多少时间”，建议任务行直接显示：

1. `duration`
   - `已累计 01:12 / 02:00`
2. `timeWindow`
   - `14:00 - 16:00 · 已累计 00:46 / 02:00`

### 当前运行任务
当前运行任务行继续保留：
1. 行内运行态底纹
2. 主按钮：
   - 运行中：`暂停`
   - 已暂停：`继续`
   - 未开始：`开始`

### 番茄次数
`🍅 0 / 1 / 2 ...` 保留，但降级为辅助信息：
- 用于复盘和轻量习惯反馈
- 不再作为任务完成主语义

### 时间线
`今日任务分布` 继续适合用时间线，因为：
1. `timeWindow` 天然属于时间规划
2. `duration` 任务如果未来没有具体开始结束时间，可考虑单独显示为“自由时长任务”

首版建议：
1. 时间线仅展示 `timeWindow` 任务
2. `duration` 任务先展示在任务列表，不强塞进时间线

## 兼容与迁移策略

### 旧数据兼容
历史任务里没有：
- `taskMode`
- `targetSeconds`
- `taskEffectiveSeconds`

建议迁移规则：
1. 旧任务默认迁移为 `timeWindow`
2. `targetSeconds = endTime - startTime`
3. 历史 `taskPomodoros` 保留，不丢弃
4. 新增 `taskEffectiveSeconds` 默认为 `0`

### 为什么不从旧番茄数反推有效时长
因为那会制造假精确：
1. 旧数据只说明“完成了几次番茄”
2. 不能保证每次番茄都完整跑完，也不能保证当时配置始终相同
3. 强行反推会把统计口径污染掉

因此建议：
- 有效时长从新模型启用后重新累计
- 番茄次数历史保留，仅作辅助展示

## 实现顺序（建议）

### 第 1 步：模型落地
1. 扩展 `FocusTask`
2. 扩展 `FocusDayStats`
3. 扩展 runtime cache

### 第 2 步：运行态累计
1. 开始时记录 `sessionStartedAtTs`
2. 暂停/切换任务/完成时结算本次 session
3. 把有效时长写回 `taskEffectiveSeconds`

### 第 3 步：完成判定与展示
1. 任务列表展示：
   - 已累计
   - 目标时长
2. 任务达标态
3. 今日任务分布与统计面板改口径

### 第 4 步：表单升级
1. 新建任务增加 `任务类型`
2. `duration` 任务展示目标时长输入
3. `timeWindow` 任务展示开始/结束时间输入

## 风险点
1. 这是任务模型升级，不是单纯 UI 改动。
2. 会影响：
   - 任务表单
   - 统计面板
   - 今日任务分布
   - 任务完成判定
   - 历史数据兼容
3. 如果不先把“运行态累计口径”定清，后面很容易再次出现：
   - 切 tab 计时不准
   - 暂停后累计重复
   - 任务切换丢失 session

## 本轮结论
1. 现有系统需要从“番茄钟计时”升级为“任务有效时长计时”。
2. 两类任务都可以统一成 `targetSeconds` 模型。
3. `timeWindow` 不再限制“只能在时间窗内计时”，而只决定目标时长与计划展示。
4. 首版完成判定按“当天累计有效时长”执行。
5. 启动过的任务必须展示“已累计时长”，这是新模型的核心可见反馈。

## 首轮实现状态（2026-03-28）

### 已落地
- 文件：
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-model.js`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-runtime.js`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-timer-runtime-cache.js`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusPlanner.svelte`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusPlannerTaskItem.svelte`

### 当前行为
1. 任务模型已增加 `taskMode` / `targetSeconds`
2. 每日统计已增加 `taskEffectiveSeconds`
3. 专注运行态会在以下节点结算有效时长：
   - 点击 `暂停`
   - 切换到其他任务
   - 删除当前任务
   - 当前番茄自然结束
4. 任务行会显示 `已累计 xx:xx / 目标 xx:xx`
5. 当前正在运行的任务会把本次 session 的实时秒数叠加到当日累计展示中

### 当前仍未展开
1. `duration` / `timeWindow` 的底层模型已经落地，但统计面板尚未完全按“有效时长优先”重构
2. 统计面板仍保留 `🍅` 作为辅助指标，尚未改成以有效时长为主的复盘视图

## 第二轮实现状态（2026-03-28）

### 已补齐
- 文件：
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusPlanner.svelte`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusPlannerTaskItem.svelte`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/strings.js`

### 当前行为
1. 新建任务表单已支持两种模式：
   - `时间窗`
   - `时长型`
2. `时长型` 任务创建时只填写：
   - 标题
   - 目标分钟数
   - 重复规则
3. `时间窗` 任务创建时继续填写：
   - 标题
   - 开始时间
   - 结束时间
   - 重复规则
4. 任务编辑态也同步支持这两种模式，避免“创建支持，编辑回退”的状态不一致
5. `duration` 类型任务在列表中不再展示伪造的时间窗，而显示 `自由时长`

## 第三轮实现状态（2026-03-28）

### 已补齐
- 文件：
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-runtime.js`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-deadlines.js`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusPlannerTaskItem.svelte`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceTaskTimeline.svelte`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusStats.svelte`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceSidebar.svelte`

### 当前行为
1. “任务是否完成”已经正式切到 `有效时长达标`：
   - `effectiveSeconds >= targetSeconds`
2. 任务行会显示 `已达标` 状态胶囊，并采用完成态边框
3. 侧边栏“今日任务”会优先展示：
   - 已累计 / 目标
   - 状态：`已达标 / 进行中 / 待开始 / 已超时`
4. 今日时间线不再以 `🍅` 为主文案，而改为 `已累计 / 目标`
5. `duration` 任务不会被错误塞进时间线，时间线只展示真正有时间窗的任务
