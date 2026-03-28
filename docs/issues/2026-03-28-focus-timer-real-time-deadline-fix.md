# 2026-03-28 专注倒计时走慢（真实时间漂移）修复

## 判定
- 类型：`Bug/回归`
- 现象：实际已经过去约 `200s`，工作台中的番茄倒计时或独立休息倒计时只减少了约 `100s`。
- 结论：不是设计行为，而是前端仍按“定时器触发次数”扣秒，没有统一按真实时间差结算。

## 根因
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
  中主番茄倒计时和独立休息倒计时都存在 `setInterval(..., 1000)` 后直接 `remainingSec -= 1` /
  `breakRemainingSec -= 1` 的旧实现。
- 当页面切后台、浏览器/运行时节流、渲染线程忙或窗口失焦时，`setInterval` 的真实触发频率会低于 `1Hz`。
- 休息提醒推进链 `focusSinceBreakSec += 1` 也同样依赖 tick 次数，因此不仅显示会变慢，提醒触发时机也会漂移。

## 修复方案

### 1. 主番茄倒计时改为截止时间驱动
- 新增运行态字段：
  - `focusDeadlineTs`
- 开始/继续计时时记录真实结束时间：
  - `focusDeadlineTs = Date.now() + remainingSec * 1000`
- 显示剩余秒数时统一改为：
  - `ceil((focusDeadlineTs - Date.now()) / 1000)`
- 暂停时先按截止时间回填剩余秒数，再清空 deadline。

### 2. 独立休息倒计时改为截止时间驱动
- 新增运行态字段：
  - `breakDeadlineTs`
- 触发短休/长休时记录真实结束时间。
- overlay 同步时优先使用 `breakDeadlineTs`，不再每次用 `Date.now() + remainingSec * 1000` 临时拼装结束时间。
- 关闭、跳过、延后、禁用提醒时同步清理 `breakDeadlineTs`。

### 3. 休息提醒主时钟改为真实时间增量
- 保留工作台 `1s` 主时钟，但不再假设“一次 tick 就等于过去 1 秒”。
- 改为记录 `lastClockTs`，每次 tick 时计算：
  - `elapsedSec = floor((now - lastClockTs) / 1000)`
- 用 `elapsedSec` 推进 `focusSinceBreakSec`，从而在节流或卡顿后一次补齐真实流逝时间。

### 4. 兼容旧缓存
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-timer-runtime-cache.js`
  新增缓存字段：
  - `focusDeadlineTs`
  - `breakDeadlineTs`
- 对旧缓存做向后兼容：
  - 若缓存里没有 deadline，则使用 `savedAt` 推算已流逝秒数，恢复到尽量接近真实时间的位置。

## 回归验证
1. 进入工作台 -> 专注，启动番茄钟，观察 30~60 秒。
2. 对比系统时间，页面剩余时间应与真实流逝秒数基本一致，不再明显走慢。
3. 切换窗口、切 tab、让页面失焦后再回来，倒计时应跳到真实位置，而不是慢半拍。
4. 触发 `短休 10秒 / 长休 10秒` 快速测试，确认 overlay 和工作台内剩余时间同步，并按真实时间结束。

## 影响文件
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-timer-runtime-cache.js`
