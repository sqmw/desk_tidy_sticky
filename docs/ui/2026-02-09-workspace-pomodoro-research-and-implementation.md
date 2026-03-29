# Workspace 番茄模块重构（2026-02-09）

## 背景与问题
初版把番茄模块直接放在顶部内容区（`WindowBar -> FocusHub -> Notes`），导致：
1. 信息层级混乱，功能角色不清晰。
2. 用户在“便笺流”中被迫看到“专注流”。
3. 视觉重心漂移，不符合工作台的分区逻辑。

## 本次结构调整
### 核心原则
1. 功能分区优先：番茄是独立工作流，不是便笺附属按钮。
2. 交互一致：左侧统一作为一级入口（Tab/模块）。
3. 最小侵入：保留原有便笺视图与排序逻辑，不破坏现有行为。

### 新布局（已落地）
1. 左侧一级模块：`便笺` / `番茄`。
2. 仅在 `便笺` 模块下显示二级筛选：`活动 / 待办 / 四象限 / 已归档 / 回收站`。
3. 右侧主内容区按一级模块切换：
   - `便笺`：显示 `Toolbar + Notes + Inspector`
   - `番茄`：显示 `FocusHub`（任务规划 + 计时 + 统计）
4. `番茄` 模式左侧显示“今日截止任务”列表（替代原说明占位块）。

## 当前 Workstation Tab 梳理
### 一级模块（信息架构）
1. `便笺`：面向记录、检索、整理、四象限。
2. `番茄`：面向专注任务计划、循环执行、专注统计。

### 二级筛选（仅便笺）
1. 活动
2. 待办
3. 四象限
4. 已归档
5. 回收站

## 代码变更
### 新增
1. `src/lib/workspace/workspace-tabs.js`
   - 统一定义一级模块常量与 normalize 逻辑。
2. `src/lib/components/workspace/focus/WorkspaceFocusTimer.svelte`
   - 番茄计时与配置子组件。
3. `src/lib/components/workspace/focus/WorkspaceFocusPlanner.svelte`
   - 任务规划与今日任务子组件。
4. `src/lib/components/workspace/focus/WorkspaceFocusStats.svelte`
   - 今日/近7天统计子组件。

### 修改
1. `src/routes/workspace/+page.svelte`
   - 增加 `mainTab` 状态与持久化。
   - 按 `mainTab` 条件渲染主内容区（便笺区 / 番茄区）。
2. `src/lib/components/workspace/WorkspaceSidebar.svelte`
   - 新增一级模块入口按钮（便笺/番茄）。
   - 二级便笺筛选仅在便笺模块展示。
3. `src/lib/components/workspace/WorkspaceFocusHub.svelte`
   - 从“大组件”改为“编排层”，只保留状态与流程。
4. `src/lib/workspace/preferences-service.js`
   - 读取 `workspaceMainTab` 并标准化。
5. `src-tauri/src/preferences.rs`
   - 新增 `workspace_main_tab` 偏好字段与默认值。
6. `src/lib/strings.js`
   - 新增模块化导航文案。
7. `src/lib/workspace/focus/focus-deadlines.js`
   - 提供今日截止任务筛选与排序的纯逻辑函数。

## 设计收益
1. 结构清晰：入口与内容一一对应。
2. 扩展友好：后续可平滑增加 `统计` / `日程` / `习惯` 等一级模块。
3. 用户认知成本下降：从“混合页面”切回“模块页面”。
4. 组件职责更单一：计时/任务/统计拆分，维护成本降低。

## 体验修正（2026-02-09 第二轮）
### 番茄功能补强
1. 历史版本曾支持设置 `目标番茄数`（每日任务粒度）。
2. 今日任务区展示每条任务的番茄进度：`完成/目标`。
3. 统计区新增任务维度进度汇总与百分比（今日任务完成率）。
4. 计时卡新增阶段进度条，强化专注状态反馈。

### 视觉升级
1. 计时/任务/统计卡片统一为玻璃质感卡片，增强层级。
2. 按钮、输入、标签统一 token 风格，不再出现原生表单观感。
3. 新增父级兜底样式，避免在个别环境中退化成“浏览器默认样式”。
4. 任务输入行改为响应式网格：大屏 6 列，中屏 4 列，窄屏 2 列并自动换行，不再出现按钮与文本溢出。

### 拖动误触修正
1. 工作台拖动改为“显式句柄”策略：
   - 顶部仅标题拖动区可拖动；
   - 左侧仅品牌区可拖动。
2. 移除侧栏整块拖动触发，降低误触概率。
3. 在拖动逻辑中新增 `data-drag-handle=\"workspace\"` 句柄校验。
4. 番茄模式下移除左侧“番茄说明卡”，避免无效占位与视觉噪声。

## 体验修正（2026-02-09 第三轮）
### 番茄计时与任务联动
1. 计时卡新增专注时长快捷档：`25m` 与 `40m`。
2. 计时卡新增“当前专注任务”下拉，直接选择今日任务。
3. 任务源与右侧规划区一致，避免“计时和任务脱节”。
4. 当今日任务存在且当前任务未选中/失效时，自动对齐到第一条任务。

### 信息降噪与图标一致性
1. 去掉计时卡中“番茄钟”右侧常驻“专注”文案，避免重复信息。
2. 在计时卡主 Badge 增加 `🍅` 图标，强化模块识别。
3. 阶段文案改为仅在非专注阶段显示（短休息/长休息），并配合轻量图标提示。

## 体验修正（2026-02-09 第四轮）
### 数字输入与暂停语义修复
1. 番茄设置区（专注/短休息/长休息/长休息每）全部替换原生 `number` 输入为统一自定义数字控件。
2. 新控件支持滚轮、加减按钮、手动输入三种调节方式，并与工作台主题样式统一。
3. 修复“暂停后时间重置”的逻辑错误：
   - 暂停只停止计时，保留当前剩余时间；
   - 仅点击“重置”才恢复到当前阶段默认时长。
4. 修复“25m/40m 与设置面板不同步”问题：
   - 点击快捷档时，实时同步设置面板中的“专注（分钟）”草稿值；
   - 避免出现“外部已切换，面板里仍是旧值”的状态不一致。

## 2026-03-26 补充：番茄运行态边界收口

### 判定
- 类型：`设计收敛`
- 原因：番茄钟与独立休息控制长期共用 `focus / shortBreak / longBreak` phase，已经多次引入计时冻结、错误恢复和 overlay 串扰回归。

### 新边界
1. `番茄钟` 只负责：
   - 任务选择
   - 专注倒计时
   - 完成一个番茄后的统计累积
2. `休息控制` 只负责：
   - 按独立配置触发小休 / 长休提醒
   - 管理休息 overlay 的开始、跳过、延后与倒计时
3. 两条链路不再共享番茄 phase。

### 代码收敛
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusTimer.svelte`

1. 番茄主计时器不再进入 `shortBreak / longBreak`。
2. 每次番茄倒计时结束后：
   - 只累计一次完成数与统计；
   - 计时器回到新的专注态；
   - 等待用户再次点击开始。
3. 番茄设置面板移除：
   - `短休息（分钟）`
   - `长休息（分钟）`
   - `每多少轮长休一次`
4. 历史配置字段仍保留兼容，不主动删除，但不再驱动当前番茄运行态。

### 回归结果
1. 番茄计时完成后，不会再自动切到内建短休 / 长休 phase。
2. 独立休息提醒不会再被番茄 phase 污染。
3. 旧缓存中残留的短休 / 长休 phase 会在恢复时统一归一到专注态。

## 2026-03-27 补充：目标番茄数能力下线

### 判定
- 类型：`设计收敛`

### 当前状态
1. 任务不再设置“目标番茄数”。
2. 任务仍保留“已完成多少个番茄”的统计。
3. 今日任务、计时卡、统计面板、截止任务卡均已移除 `done/target` 和基于目标的完成率语义。

### 文档入口
- 现行说明：
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/docs/ui/2026-03-27-workspace-focus-target-pomodoro-removal.md`

## 2026-03-27 补充：任务运行态可视化

### 判定
- 类型：`设计收敛`

### 问题
1. 任务点击 `开始` 后，顶部计时器会切到该任务并启动倒计时。
2. 但任务规划列表本身没有显示“已开始”的任务态，用户需要来回对照顶部计时器和底部任务列表，认知成本高。

### 调整
1. 当前已开始的任务行显示 `已开始` 状态胶囊。
2. 任务行加入低饱和青绿色进度底纹，直接反映 `已累计 / 目标` 的完成进度。
3. 任务行的 `开始` 按钮在该任务已启动后切为 `已开始` 并禁用，避免误解为“还没开始”。

### 实现
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 负责提供当前运行任务 `id`、是否开始、是否运行与进度百分比。
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusPlanner.svelte`
  - 将运行态透传到单条任务组件。
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusPlannerTaskItem.svelte`
  - 负责最终视觉呈现。

## 2026-03-27 补充：计时器顶部信息层级收敛

### 判定
- 类型：`设计收敛`

### 问题
1. 顶部计时器区在“当前任务”之外，还保留了一个单独的“今日番茄数”大块。
2. 在目标番茄数与任务完成率退役后，这个大块显得信息价值偏低，但占位又过重，容易让人感觉还是旧模型残留。

### 调整
1. `当前任务` 升为左侧主信息卡。
2. `今日番茄数` 压缩为右侧摘要 chip。
3. 顶部不再提供任务选择与 `25m/40m` 快捷档。
4. 顶部只保留开始/暂停与重置，作为纯运行控制区。
5. 原 `设置` 下沉到 `专注任务规划` 区，通过 `编辑设置` 入口展开。

### 代码位置
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/focus/WorkspaceFocusTimer.svelte`
