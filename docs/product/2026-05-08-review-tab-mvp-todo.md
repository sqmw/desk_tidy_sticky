# 回顾 Tab / 已办记录 MVP TODO（2026-05-08）

日期：2026-05-08  
范围：`workstation（工作台）` 的 `回顾` 一级 tab、已办记录、日历回看、专注统计迁移  
状态：进行中（P0-P1 已完成，P2-P4 已进入可用推进态，P5 已有首版闭环并继续打磨）

关联文档：

- [已办记录 / Done Log 蓝图](/Users/sunqin/study/language/rust/code/desk_tidy_sticky/docs/product/2026-05-05-done-log-blueprint.md)
- [工作台里“记录做了什么”应该放在哪：信息架构蓝图](/Users/sunqin/study/language/rust/code/desk_tidy_sticky/docs/product/2026-05-08-workstation-done-log-placement-blueprint.md)

---

## 1. 目标

在不破坏当前 `mini + workstation` 双模式结构的前提下，给 `workstation` 增加一个明确的“结果层 / 回顾层”。

最终希望工作台形成三层心智：

1. `笔记`
   - 输入、草稿、整理
2. `专注`
   - 任务执行、番茄运行、休息控制
3. `回顾`
   - 做了什么、哪天做的、做成多少

---

## 2. 当前判断

- `Bug或回归`：不是，本项属于新功能与信息架构演进。
- 当前推荐路线已确定：
  - 一级 tab 增加 `回顾`
  - `回顾` 下分 `已办 / 日历 / 统计`
  - `专注` 页只保留轻量 summary，不再承担完整统计面板
- 当前不建议：
  - 把 `统计` 单独提升为一级 tab
  - 把已办记录长期混在 `笔记` 视图里

---

## 3. MVP 边界

## 本轮要做

1. 为 `workstation` 增加 `回顾` 一级 tab
2. 把当前 `专注` 里的完整统计视图迁到 `回顾 -> 统计`
3. 为 `回顾` 预留 `已办 / 日历 / 统计` 二级结构
4. 在数据层补足 Done Log 所需最小字段
5. 在 `回顾 -> 已办` 中落第一版已办记录列表
6. 在 `回顾 -> 日历` 中落第一版月历视图
7. 在 dev 模式为回顾页提供只读演示假数据，便于空态下继续调布局和交互

## 本轮不做

1. 社交分享
2. 云同步
3. AI 自动周报/月报
4. 情绪追踪/地理轨迹
5. 多图复杂相册式管理
6. 独立移动端策略
7. release 包内携带演示假数据

## 3.1 Dev fixtures 约定

1. 仅开发态允许注入回顾页演示数据
2. 默认开关：
   - `import.meta.env.DEV === true`
   - `VITE_ENABLE_REVIEW_DEV_FIXTURES !== false`
3. 注入位置：
   - 仅 `workstation -> 回顾`
   - 不写入真实 `notes.json`
   - 不污染 `笔记` / `专注` 主数据源
4. 使用策略：
   - 有真实回顾数据时，假数据让路
   - 回顾页为空时，才显示演示数据用于调布局和交互

---

## 4. 阶段计划

## P0：IA 收口与导航骨架

状态：已完成  
优先级：最高

目标：

1. 工作台一级 tab 从：
   - `笔记`
   - `专注`
   改为：
   - `笔记`
   - `专注`
   - `回顾`
2. 回顾页先搭空骨架：
   - `记录`
   - `日历`
   - `统计`
3. `专注` 页保留：
   - 今日专注分钟
   - 今日番茄总数
   - 连续专注天数
   - 一个进入 `回顾` 的轻入口

建议改动点：

- `src/lib/workspace/workspace-tabs.js`
- `src/routes/workspace/+page.svelte`
- `src/lib/components/workspace/sidebar/WorkspaceSidebarModules.svelte`
- `src/lib/components/workspace/WorkspaceSidebar.svelte`

验收：

1. 工作台可稳定切到 `回顾`
2. `笔记 / 专注 / 回顾` 三个主入口都可见
3. 原 `专注` 页面不会因为迁移而失去最基本的运行反馈

当前进展：

- 2026-05-08：已接入 `回顾` 一级 tab。
- 2026-05-08：已新增 `WorkspaceReviewHub.svelte` 作为 P0 骨架容器。
- 2026-05-08：`回顾` 内已预留 `已办 / 日历 / 统计` 二级切换。
- 2026-05-08：左侧侧栏已收口为纯一级导航，不再重复展示 `回顾` 的说明文案和 `已办 / 日历 / 统计` 二级入口。
- 2026-05-09：`回顾 -> 统计` 已去掉常驻大面积说明区，说明降级为标题旁轻量 `?` 提示，让统计数据本身成为主角。

---

## P1：统计迁移到回顾页

状态：已完成  
优先级：高

目标：

1. 将当前 `WorkspaceFocusStats` 从 `专注` 底部折叠区迁到 `回顾 -> 统计`
2. `专注` 页改为轻量 summary，不再承载完整 heatmap、任务分布时间线、历史 rollups

建议改动点：

- `src/lib/components/workspace/WorkspaceFocusHubView.svelte`
- `src/lib/components/workspace/pomodoro/WorkspaceFocusStats.svelte`
- 新增 `src/lib/components/workspace/review/*`

注意：

1. 不要直接把旧统计组件原样硬搬到新页面里不收口
2. 迁移时顺便统一标题与说明文案，让它从“专注统计”演进成“回顾统计”

验收：

1. `回顾 -> 统计` 可查看完整统计
2. `专注` 页面不再出现大面积统计面板
3. 原统计数据口径不变

当前进展：

- 2026-05-08：新增共享聚合 helper `src/lib/workspace/review/review-focus-stats.js`，避免 `专注` 与 `回顾` 各自维护一套统计口径。
- 2026-05-08：`回顾 -> 统计` 已接入真实 `WorkspaceFocusStats` 内容。
- 2026-05-08：`专注` 页底部已从完整折叠统计面板收敛为“轻量摘要 + 打开回顾”入口。
- 2026-05-08：本轮仍未引入 Done Log 数据语义；`回顾 -> 已办 / 日历` 先以前端过渡方案继续推进。

---

## P2：Done Log 数据层最小补足

状态：进行中（前端只读版已落地）  
优先级：最高

目标：

在复用 `note` 的前提下，补齐回顾记录最小语义。

建议字段：

- `record_kind: "note" | "done_log"`
- `completed_at: string | null`

为什么必须做：

1. `is_done` 不等于“这是一条已办记录”
2. `created_at` 不是完成时间
3. 日历聚合必须依赖显式 `completed_at`

建议改动点：

- `src-tauri/src/notes/model.rs`
- `src-tauri/src/notes/service.rs`
- `src-tauri/src/notes/commands.rs`
- 前端 note normalize / selector 层

兼容策略：

1. 老 note 默认：
   - `record_kind = "note"`
   - `completed_at = null`
2. 首轮迁移不主动篡改历史数据语义

验收：

1. 老数据正常加载
2. 新建 done log 能持久化
3. 不影响现有笔记创建/编辑/归档链路

当前进展：

- 2026-05-08：`Note` 模型已新增 `record_kind` 与 `completed_at`。
- 2026-05-08：`toggle_done` 已开始维护 `completed_at`，并在独立 done log 被取消完成时回退为普通 `note`。
- 2026-05-08：已新增 `add_done_log` 命令，供 `回顾 -> 已办` 直接创建独立已办记录。
- 2026-05-08：Flutter/Tauri 兼容加载与去重键已纳入这两个字段，避免旧数据直接炸掉。
- 2026-05-08：当前 notes 会在仓库层加载时自动补齐历史 `is_done -> completed_at` 缺失语义；legacy notes 在迁入 current 时也会同步纠偏。
- 2026-05-08：当前仍未提供“一次性历史批量迁移报告”，但读写语义已经收敛到统一口径。

---

## P3：回顾 -> 已办

状态：进行中  
优先级：高

目标：

落第一版“我做了什么”的主场。

展示内容：

1. 时间线列表
2. 标题
3. 完成时间
4. 正文摘要
5. 标签
6. 封面图（第一版可选）

创建入口建议：

1. `workstation` 顶部保留轻入口：
   - `补记已办`
2. 点击入口后，在时间线顶部插入补记卡，而不是长期摆一个常驻输入框
3. 补记卡必须显式填写：
   - 完成内容
   - 完成时间
2. `mini` 模式后续可加：
   - `保存为已办`

建议改动点：

- `src/routes/workspace/+page.svelte`
- 新增 `src/lib/components/workspace/review/WorkspaceReviewLogList.svelte`
- 新增 `src/lib/workspace/review/*`

验收：

1. 可以新建已办记录
2. 可以按时间顺序查看已办记录
3. 搜索对已办记录可用

当前进展：

- 2026-05-08：`回顾 -> 已办` 已从占位态升级为真实时间线列表。
- 2026-05-08：当前优先读取显式 `completedAt/completed_at`，同时兼容旧 `isDone` 记录作为过渡数据源。
- 2026-05-08：已支持从回顾页直接打开原笔记详情，并可将该记录重新标记为未完成。
- 2026-05-08：`回顾 -> 已办` 已新增“补记已办”入口，会在时间线顶部插入补记卡，而不是长期展示输入框。
- 2026-05-08：手动补记已支持显式填写完成时间，并会直接写入独立 done log。
- 2026-05-08：当前产品语义已收敛为“完成后自动进入已办，手动补记只是辅助入口”，不再把 `已办` 页面本身做成开发说明页。
- 2026-05-09：真实 workstation 窗口巡检后，将“补记已办”按钮保持为标题区右侧轻入口；仅极窄窗口下才换行，避免在常规窗口里变成整行主表单。

---

## P4：回顾 -> 日历

状态：进行中（首版月历已落地）  
优先级：高

目标：

落第一版月历回看。

第一版只做：

1. 月历
2. 每天记录数量
3. 点击某天后展示当天详情

暂不做：

1. 周历
2. 热力年历
3. On This Day

建议改动点：

- 新增 `src/lib/components/workspace/review/WorkspaceReviewCalendar.svelte`
- 新增 `src/lib/components/workspace/review/WorkspaceReviewDayDrawer.svelte`
- 新增 `src/lib/workspace/review/review-calendar.js`

验收：

1. 能按 `completed_at` 聚合到月历
2. 点击日期可看当天记录
3. 没有记录的日期不制造噪声

当前进展：

- 2026-05-08：首版月历已可按前端过渡时间戳进行按天聚合。
- 2026-05-08：随着 `completed_at` 落地，月历已优先按显式完成时间聚合。
- 2026-05-08：点击日期后，右侧详情区会展示当天记录列表，并支持继续打开原笔记。
- 2026-05-08：当前月历仍依赖过渡口径，不代表 `completed_at` 数据层已经完成。

---

## P5：专注 -> 已办闭环

状态：进行中（首版完成后提示已落地）  
优先级：中

目标：

把“执行”与“结果”真正串起来。

候选能力：

1. 专注任务完成后，弹出：
   - `记一条已办记录`
2. 自动带入：
   - 任务标题
   - 专注时长
   - 番茄数
   - 完成时间

这一阶段是产品记忆点，但不是第一批必须落地。

当前进展：

- 2026-05-08：一次番茄专注完成后，专注页会弹出“记到回顾里”的轻提示卡。
- 2026-05-08：提示卡会自动带入任务标题、专注时长与该任务今日番茄数，用户可直接编辑后保存为 done log。
- 2026-05-08：提示策略已收敛为“当前任务第一次达成目标时才提示”，避免连续番茄时每轮都弹，干扰专注。
- 2026-05-08：提示卡默认内容已补入该任务累计专注与任务时间窗，开始更像一条可复盘的 done log，而不只是简短提示。
- 2026-05-08：当前仍未做更细粒度的频控策略（例如用户级开关、达到目标后继续超额完成时的二次提醒规则），所以本阶段仍保持进行中。

---

## 5. 组件与模块拆分建议

## 前端

建议新增功能域：

- `src/lib/components/workspace/review/`
- `src/lib/workspace/review/`

建议组件：

1. `WorkspaceReviewHub.svelte`
2. `WorkspaceReviewSummaryBar.svelte`
3. `WorkspaceReviewTabs.svelte`
4. `WorkspaceReviewLogList.svelte`
5. `WorkspaceReviewLogItem.svelte`
6. `WorkspaceReviewCalendar.svelte`
7. `WorkspaceReviewDayDrawer.svelte`
8. `WorkspaceReviewStats.svelte`

建议 helper：

1. `review-record-selectors.js`
2. `review-calendar.js`
3. `review-summary.js`

## 后端

当前仍建议继续复用：

- `notes/*`

而不是立刻新开：

- `done_logs/*`

除非后续出现明显模型分叉。

---

## 6. 风险记录

## 风险 A：概念冲突

用户可能分不清：

- 普通笔记
- 已办记录
- 完成的待办

收口策略：

1. 文案统一用 `补记已办`
2. 不把 `is_done` 直接对外包装成 done log
3. 显式显示 `完成时间`

## 风险 B：工作台继续膨胀

收口策略：

1. 专注页瘦身
2. 完整统计迁出
3. 回顾页内部二级切换清晰化

## 风险 C：图片把范围带大

收口策略：

1. 第一版先允许正文内图片
2. 封面图只做自动推导
3. 不做复杂图库管理

---

## 7. 当前推荐的开工顺序

建议严格按下面顺序推进：

1. `P0 IA 收口`
2. `P1 统计迁移`
3. `P2 数据层补足`
4. `P3 回顾已办列表`
5. `P4 月历`
6. `P5 专注闭环`

原因：

1. 先把结构收顺，再加内容
2. 先搬已有统计，再补新能力，风险最低
3. 数据语义补足后，记录与日历才不会返工

---

## 8. 当前状态摘要

- 信息架构方向：已确认
- 功能价值判断：已确认值得做
- 一级命名：推荐 `回顾`
- 二级结构：推荐 `已办 / 日历 / 统计`
- 当前已进入代码实现
- P0：已完成
- P1：已完成
- P2：进行中（字段与命令已落地，迁移策略待补）
- P3：进行中（时间线与时间语义完整的补记入口已落地）
- P4：进行中（首版月历已落地）
- P5：待实现
