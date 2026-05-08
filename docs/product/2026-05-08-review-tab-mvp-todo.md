# 回顾 Tab / 已办记录 MVP TODO（2026-05-08）

日期：2026-05-08  
范围：`workstation（工作台）` 的 `回顾` 一级 tab、已办记录、日历回看、专注统计迁移  
状态：进行中（P0-P1 已落地，P2-P5 待实现）

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
  - `回顾` 下分 `记录 / 日历 / 统计`
  - `专注` 页只保留轻量 summary，不再承担完整统计面板
- 当前不建议：
  - 把 `统计` 单独提升为一级 tab
  - 把已办记录长期混在 `笔记` 视图里

---

## 3. MVP 边界

## 本轮要做

1. 为 `workstation` 增加 `回顾` 一级 tab
2. 把当前 `专注` 里的完整统计视图迁到 `回顾 -> 统计`
3. 为 `回顾` 预留 `记录 / 日历 / 统计` 二级结构
4. 在数据层补足 Done Log 所需最小字段
5. 在 `回顾 -> 记录` 中落第一版已办记录列表
6. 在 `回顾 -> 日历` 中落第一版月历视图

## 本轮不做

1. 社交分享
2. 云同步
3. AI 自动周报/月报
4. 情绪追踪/地理轨迹
5. 多图复杂相册式管理
6. 独立移动端策略

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
- 2026-05-08：`回顾` 内已预留 `记录 / 日历 / 统计` 二级切换。
- 2026-05-08：侧栏已为 `回顾` 增加独立 overview 区，不再复用 `专注` 的 deadline 区块。
- 2026-05-08：当前 `统计` 子页仍为占位说明，完整统计迁移留到 P1。

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
- 2026-05-08：本轮仍未引入 Done Log 数据语义；`回顾 -> 记录 / 日历` 保持骨架，占位等待 P2/P3/P4。

---

## P2：Done Log 数据层最小补足

状态：待办  
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

---

## P3：回顾 -> 记录

状态：待办  
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

1. `workstation` 顶部新增：
   - `记录已办`
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

---

## P4：回顾 -> 日历

状态：待办  
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

---

## P5：专注 -> 已办闭环

状态：待办  
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

1. 文案统一用 `记录已办`
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
4. `P3 回顾记录列表`
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
- 二级结构：推荐 `记录 / 日历 / 统计`
- 当前已进入代码实现
- P0：已完成
- P1：已完成
- P2-P5：待实现
