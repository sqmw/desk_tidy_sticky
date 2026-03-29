# 2026-03-27 Workspace 专注任务“目标番茄数”能力下线

## 判定
- 类型：`设计收敛`
- 触发原因：任务创建/编辑表单中的“目标番茄数”输入不直观，且该能力已经牵连出自动完成、截止过滤、进度百分比等一整套额外状态，和当前“番茄钟只负责任务计时”的产品边界不一致。

## 新边界
1. 每条专注任务只保留：
   - 标题
   - 开始时间
   - 结束时间
   - 重复规则
2. 任务不再配置“需要几个番茄才算完成”。
3. 任务仍然保留“已完成的番茄次数”统计，用于回顾，不再用于完成判定。

## 代码变更

### 1. 任务模型去掉 `targetPomodoros`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-model.js`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-runtime.js`

调整：
1. `FocusTask` 归一化不再保留 `targetPomodoros`。
2. `buildFocusTaskFromDraft(...)` 不再接收或写入 `targetPomodoros`。
3. 自动完成判定函数 `isFocusTaskCompleted(...)` 已移除。
4. `buildTodaySummary(...)` 不再生成：
   - `completedCount`
   - `targetPomodoros`

### 2. Planner 创建/编辑 UI 删除目标番茄输入
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusPlanner.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusPlannerTaskItem.svelte`

调整：
1. 新建任务表单移除目标番茄输入控件。
2. 任务编辑态移除目标番茄输入控件。
3. 任务列表展示从 `🍅 done/target` 改为仅显示 `🍅 done`。

### 3. 计时卡与统计区移除目标番茄进度语义
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusTimer.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusStats.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`

调整：
1. 当前选中任务区域不再显示 `done/target` 比例和进度条。
2. 统计区不再显示目标番茄总数与完成率。
3. 改为显示：
   - 今日任务数
   - 今日番茄总数
   - 单任务已完成番茄数

### 4. 左侧今日截止任务不再做目标完成过滤
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-deadlines.js`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceSidebar.svelte`

调整：
1. 今日截止任务列表不再因为“达到目标番茄数”而隐藏任务。
2. 卡片内不再显示百分比与进度条，只保留 `🍅 已完成次数`。

## 兼容策略
1. 历史数据里如果仍保存了 `targetPomodoros`，当前运行时会忽略它。
2. `taskPomodoros` 保留，用于展示已经完成了多少次专注。
3. 旧文档里关于“目标番茄数”“自动完成”的内容均已退役，不应再作为现行实现依据。

## 后续演进入口
1. 目标番茄数能力下线后，任务完成语义将进一步收敛到“有效时长模型”。
2. 现行设计草案见：
   - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/docs/ui/2026-03-28-workspace-focus-effective-time-model.md`

## 回归验证
1. 打开工作台 -> 专注 -> 专注任务规划。
2. 确认新建任务表单不再出现目标番茄数字输入。
3. 编辑任意任务，确认编辑面板也不再出现目标番茄数字输入。
4. 启动专注若干次后，确认任务卡、计时卡、统计区只显示已完成番茄数，不再出现 `done/target`、百分比、完成率。
5. 确认左侧今日截止任务不会因为历史目标番茄设置而自动消失。

## 2026-03-27 补充：任务级休息参数同步退役

### 判定
- 类型：`设计收敛`

### 新边界
1. `番茄任务` 只保留：
   - 标题
   - 开始时间
   - 结束时间
   - 重复规则
2. `休息控制` 完全独立，不再允许每条任务配置自己的小休/长休节奏。

### 代码变更
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusPlanner.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusPlannerTaskItem.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-model.js`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-runtime.js`

调整：
1. 新建任务表单移除“任务休息参数（默认/自定义）”。
2. 任务编辑态移除同类配置。
3. 任务卡片不再显示 `⏸ 10/30m` 之类的任务级休息信息。
4. `FocusTask` 模型与构建函数不再保留 `breakProfile`。
