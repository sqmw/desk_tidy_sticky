# Workspace 休息覆盖层：Stretchly 风格全屏倒计时（2026-02-20）

## 背景
- 之前休息流程仍偏“弹窗确认”。
- 目标改为 Stretchly 风格：
  - 到点直接进入休息倒计时。
  - 多屏同时显示全屏休息覆盖层。
  - 底部固定 `延后 2 分钟`。
  - 仅在“已延后过一次”后提供 `跳过`。

## 交互收敛
1. 触发休息时不再询问“是否开始休息”，直接进入短休/长休倒计时。
2. 覆盖层中心显示：
   - 当前休息类型文案（短休/长休）
   - 任务标题（如有）
   - 进度条与剩余时间
3. 覆盖层底部动作：
   - `延后 2 分钟`（固定值）
   - `跳过`（仅延后后可见/可用）
4. `strict` 模式下动作禁用，保留状态提示。

## 多屏实现要点
- `ensureBreakOverlayWindows()` 按显示器枚举创建/复用 overlay 窗口。
- `emitBreakOverlayState()` 统一广播当前倒计时与动作可用性。
- `BREAK_OVERLAY_EVENT_ACTION` 将 overlay 的按钮操作回传到 workspace runtime。
- 休息结束或退出休息态时，主动 `closeBreakOverlayWindows()` 清理窗口。

## 与番茄流程绑定规则
- 番茄工作阶段计时中：短休/长休按独立间隔推进。
- 到点：直接进入对应休息阶段（短休或长休，长休优先）。
- `延后 2 分钟`：返回专注阶段并重排下一次同类型休息触发点。
- `跳过`：仅在“先延后过”条件满足时可执行，执行后回到专注并恢复常规间隔。

## 代码位置
- `src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 覆盖层窗口生命周期
  - overlay 状态同步
  - overlay 动作回传
- `src/routes/break-overlay/+page.svelte`
  - 全屏倒计时展示
  - 底部延后/跳过动作
- `src/lib/strings.js`
  - 休息覆盖层新增文案键

## 参考
- 本地 Stretchly 实现：
  - `F:\language\JavaScript\code\stretchly\app\break-renderer.js`
  - `F:\language\JavaScript\code\stretchly\app\breaksPlanner.js`
  - `F:\language\JavaScript\code\stretchly\app\break.html`

## 2026-02-20 修复补充：多屏偏移与到时自动收起
- 修复 1：主屏出现“副屏边缘残留”
  - 原因：多屏混合 DPI 下对 monitor 坐标做 scale 换算会导致偏移误差。
  - 处理：overlay 窗口创建改为直接使用 monitor 原生桌面坐标与尺寸，不再做缩放换算。
- 修复 2：倒计时到 00:00 未自动关闭覆盖层
  - 在休息计时自然结束分支里，显式关闭全部 overlay 窗口。
  - 增加兜底：若检测到休息态且剩余时间 `<= 0`，强制回到专注态并关闭 overlay。

## 2026-02-20 修复补充（二）：多屏坐标单位与重建策略
- 发现 `WebviewWindow` 构造参数 `x/y/width/height` 为逻辑像素。
- overlay 多屏定位改回 `physical / scaleFactor -> logical`，避免跨屏错位。
- 为避免历史错误几何残留：每次创建 overlay 时优先重建旧同名窗口。
- 额外增加“离开休息阶段即关闭 overlay”兜底，防止 00:00 后残留窗口。

## 2026-02-20 修复补充（三）：休息到时强制收起（双保险）
- 结束路径新增统一收敛函数：
  1) 先向全部 overlay 发送 `{ close: true }` 事件，窗口自关；
  2) 再按 label 主动逐个关闭；
  3) 最后执行全量兜底关闭。
- overlay 页面新增自关闭逻辑：
  - 收到 `close: true` 立即关闭；
  - 收到 `remainingSeconds <= 0` 也会自关。
- 目标：即使某一条关闭链路失效，也不会残留全屏休息窗口。

## 2026-02-20 修复补充（四）：消息队列溢出与自动收起稳定性
- 现象：`PostMessage failed ... 0x80070718`，说明 UI 消息发送过密导致队列溢出。
- 根因：overlay 关闭/同步链路存在高频触发与重复发送。
- 修复：
  1) overlay 生命周期改为“状态跃迁触发”（仅在休息态开/关切换时处理窗口创建/关闭）；
  2) overlay 同步改为单飞模型（in-flight + queued），禁止并发风暴；
  3) payload 去重发送（关键字段未变化时不重复 emit）；
  4) 关闭路径统一 `force` 收敛，避免残留窗口；
  5) strict 模式下强制禁止延后/跳过（包含 overlay 入口）。
- 结果：显著降低 event emit 频率，避免消息队列打满。

## 2026-02-20 修复补充（五）：overlay 本地倒计时自收敛
- 新增 payload 字段：`endAtTs`、`totalSeconds`、`remainingPrefix`。
- overlay 端改为“本地倒计时驱动”：
  - 按 `endAtTs` 计算剩余秒并刷新进度；
  - 倒计时到 0 自动自关；
  - 即使主窗口后续事件丢失，也不会卡在 00:00。
- 启动 3 秒内若未收到任何状态 payload，overlay 自动关闭，避免空窗口残留。

## 2026-02-20 修复补充（六）：多屏几何与关闭权限
- overlay 窗口几何改为双阶段：
  1) 创建时使用逻辑像素初值；
  2) 创建后强制 `PhysicalPosition + PhysicalSize` 校正到显示器物理边界。
- 关闭链路增加 fallback：`hide -> close -> destroy`，避免 `close` 失败后残留窗口。
- capability 增补：`core:window:allow-set-size`、`core:window:allow-destroy`，确保几何校正和销毁可执行。

## 2026-02-20 修复补充（七）：休息控制开关与快速联调
- 入口开关改为单一左右 Toggle（关闭/开启），替代双文案按钮。
- 间隔输入改为即时提交，短休/长休间隔下限统一到 1 分钟。
- 增加 10 秒快速触发（短休/长休）用于开发联调。
- 详情见：`docs/ui/2026-02-20-workspace-break-control-toggle-and-fast-test.md`

## 2026-02-20 修复补充（八）：副屏左侧留白与主屏溢出
- 现象：副屏 overlay 左侧出现窄留白，同时右侧外溢到主屏左边。
- 根因：多屏混合 DPI 下，窗口几何经历“逻辑坐标创建 + 物理坐标二次矫正”会出现偏移叠加；再叠加 Windows 阴影边缘，体感为左留白右溢出。
- 修复：
  1) overlay 几何改为单一路径（仅逻辑坐标）；
  2) 逻辑坐标取整策略改为 `x/y=floor`、`width/height=ceil`，避免亚像素缝隙；
  3) 显式关闭窗口阴影（`shadow: false` + `setShadow(false)`）减少可见边缘偏移。
- 能力权限新增：`core:window:allow-set-shadow`。

## 2026-02-20 修复补充（九）：倒计时卡 00:00 与点击无响应
- 现象：
  1) overlay 进入后约 3 秒会变成默认文案 `Take a break / Remaining 00:00`；
  2) 倒计时结束不自动收起，点击按钮无反应。
- 根因：
  1) `READY` 事件处理里再次调用 `ensureBreakOverlayWindows()`，而该函数会重建窗口，造成握手重入与状态丢失；
  2) overlay 与 host 初始化存在竞态，首次 `READY` 可能丢失，页面落入默认态；
  3) overlay 在宿主事件链路延迟时缺少本地关闭兜底。
- 修复：
  1) `WorkspaceFocusHub` 的 `READY` 监听改为仅回发当前 label 状态，不再触发窗口重建；
  2) overlay 页面增加握手重试（每 500ms 重发 `READY`，直到收到 payload）；
  3) 无 payload 超时关闭窗口（12s 兜底）；
  4) 点击 `延后/跳过` 后本地先关闭 overlay，再由宿主同步状态；
  5) overlay 创建时显式 `setIgnoreCursorEvents(false)` 与 `setFocus()`，避免输入状态异常导致点击无响应。

## 2026-02-20 修复补充（十）：多屏失步（单屏英文回退）与关闭锁死
- 现象：
  1) 某一屏倒计时过程中突然回退到 `Take a break / Remaining 00:00`；
  2) 该屏可能卡住不自动关闭。
- 关键修复：
  1) overlay 窗口管理改为“优先复用”，避免重复 `ensure` 时强制重建造成握手竞态；
  2) overlay 状态广播改为“逐窗口容错”，单窗口 emit 失败不再影响其他窗口；
  3) host 侧引入 overlay 初始化单飞，收敛并发 ensure；
  4) overlay 页面增加关闭重试与静默重握手，避免单次 close 失败后永久卡死。
- 详情文档：`docs/ui/2026-02-20-workspace-break-overlay-multiscreen-desync-hardening.md`
