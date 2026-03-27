# 工作台休息控制简化重构（单一模式）

## 背景
用户反馈当前「休息控制」信息和按钮过多，存在明显认知负担：
1. `提醒状态 / 暂停预设 / 30分钟/1小时/2小时` 等内容不符合核心诉求。
2. 用户实际只需要：
   1. 短休间隔
   2. 长休间隔
   3. 短休时长
   4. 长休时长
   5. 一键开启/关闭提醒

## 本次改动

### 1) 休息控制面板改为单一职责
文件：`src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`

调整：
1. 删除复杂控制区：
   - 暂停预设
   - 会话时段（30m/1h/2h/今天）
   - 提醒方式切换
   - 冗余状态文案
2. 保留并强化核心区：
   - 下次小休倒计时
   - 下次长休倒计时
   - 独立小休间隔（分钟）
   - 独立长休间隔（分钟）
   - 小休时长（秒）
   - 长休时长（分钟）
   - 开启提醒 / 关闭提醒
3. 当提醒已触发（`breakPrompt`）时，仅保留必要动作：
   - `开始休息`
   - `跳过`

### 2) 休息提醒增加明确开关
文件：
- `src/lib/components/workspace/WorkspaceFocusHub.svelte`
- `src/lib/workspace/focus/focus-runtime.js`
- `src/lib/workspace/preferences-service.js`
- `src/lib/workspace/controllers/workspace-focus-actions.js`
- `src/routes/workspace/+page.svelte`
- `src-tauri/src/preferences.rs`

调整：
1. 新增配置字段：`breakReminderEnabled`（默认 `true`）。
2. 触发逻辑收敛：
   - 关闭提醒时，不再推进休息提醒计时与触发。
   - 开启提醒时，重置提醒时钟并从当前配置重新开始计时。
3. 偏好持久化打通：
   - 前端 normalize/load/save 全链路新增该字段。
   - Rust `PanelPreferences` 新增 `pomodoro_break_reminder_enabled` 字段并默认开启。

### 3) 文案同步
文件：`src/lib/strings.js`

调整：
1. `pomodoroBreakControlEnable` -> `开启提醒 / Enable reminders`
2. `pomodoroBreakControlDisable` -> `关闭提醒 / Disable reminders`
3. `pomodoroBreakActionHint` 改为“开启后按间隔自动触发提醒”的说明文案。

### 4) 严重计时 bug 修复：短休不再重置长休倒计时
文件：`src/lib/components/workspace/WorkspaceFocusHub.svelte`

问题：
1. 原实现在 `applyBreakNow(kind)` 中无条件执行 `focusSinceBreakSec = 0`。
2. 导致用户进入短休后，长休倒计时被重新拉满，和预期不符。

修复：
1. 仅在 `kind === "long"` 时重置 `focusSinceBreakSec`。
2. `kind === "mini"` 时不重置累计专注秒数，只重排下一次短休触发点：
   - `nextMiniBreakAtSec = focusSinceBreakSec + breakPlanSec.miniEverySec`
3. 结果：短休开始/结束后，长休倒计时连续，不再跳回初始值。

### 5) 冲突优先级修复：长休优先于短休
文件：`src/lib/components/workspace/WorkspaceFocusHub.svelte`

规则：
1. 当同一时刻短休与长休同时满足触发条件时，统一选择长休。
2. 触发面板不允许“从长休降级回短休”。

实现：
1. 在 `tickBreakReminderClock()` 中显式计算 `dueKind`：
   - `long` due 优先；
   - 否则才是 `mini` due。
2. 在 `openBreakPrompt(kind)` 增加保护：
   - 当前已是长休提示时，忽略后续短休覆盖请求。

### 6) 布局语义收敛：按列分组，不按行分组
文件：`src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`

问题判定：
1. 这是设计收敛，不是功能 bug。
2. 旧布局把：
   - 顶部倒计时
   - 中部间隔配置
   - 底部时长配置
   拆成多行并排，用户容易误读成“同一行是一组左右配对”。
3. 但该面板真实语义是按列分组：
   - 左列 = 小休全量配置
   - 右列 = 长休全量配置

调整：
1. 将倒计时卡片与两个对应输入统一收拢到各自列内。
2. 使用 `schedule-columns + schedule-column` 结构替代分散的多行 grid。
3. 保留整体外层卡片，不再额外给每列增加重边框，避免“盒中盒”层级过多。
4. 通过以下方式强化“按列阅读”的心智：
   - 每列独立标题
   - 列内垂直堆叠
   - 两列之间加入轻量分隔线
   - 窄屏下自动改为纵向堆叠，避免误判左右关系

结果：
1. 用户更容易理解“左列看小休，右列看长休”。
2. 不再需要额外套框来提示分组，信息层级更干净。

### 7) 倒计时展示与参数配置分层
文件：`src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`

问题判定：
1. 这是设计问题，不是功能 bug。
2. 旧版把 `下次小休 / 下次长休` 的大倒计时直接塞进左右配置列内部。
3. 导致“状态展示”和“参数配置”混在同一层，两个大框显得笨重，也破坏面板整体节奏。

调整：
1. 将两个倒计时从左右配置列中抽离。
2. 在头部下方新增一行轻量状态卡：
   - 左侧：`下次小休`
   - 右侧：`下次长休`
3. 两列内部只保留参数输入：
   - 间隔
   - 时长
4. 配置列不再重复显示 `下次小休 / 下次长休` 标题，标题语义只保留在上方状态卡。
5. 倒计时卡改为更轻的展示样式：
   - 细边框
   - 微弱投影
   - 底部彩色强调线
   - 不再使用厚重的大输入框视觉

结果：
1. 用户先看到“状态”，再看到“配置”。
2. 休息控制面板的层级更接近 dashboard，而不是堆叠表单。
3. 避免了同一语义在上下两层重复出现，整体观感更轻，更符合当前工作台的极简和美学方向。

## 验证
1. `npm run check`：通过（0 error / 0 warning）。
2. `cargo check`：通过（仅已有 dead_code warning）。

## 结果
休息控制页面从“多模式混合”收敛为“单一提醒配置模式”，交互路径更短、语义更清晰，符合用户提出的核心模型：  
`设置间隔 + 设置时长 + 开关提醒 -> 到点提醒休息`。
