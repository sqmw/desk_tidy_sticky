# Workspace 专注模块：Stretchly 风格休息策略（Phase 2）

## 本次目标
- 在 Phase 1（双阶段休息 + 提前提醒）基础上，增加可操作策略：
  - `Postpone`（延后）
  - `Skip`（跳过）
  - `Strict`（严格模式）
- 同时处理多屏体验：提醒不只靠系统通知，增加窗口内提示卡。

## 核心改动
### 1) 配置模型扩展
- 新增配置项：
  - `miniBreakPostponeMinutes`
  - `longBreakPostponeMinutes`
  - `breakPostponeLimit`
  - `breakStrictMode`
- 前后端均支持持久化与默认值，保证重启后策略一致。

### 2) 运行时策略接入
- `WorkspaceFocusHub` 新增“休息提示卡”状态：
  - 到达小休/长休触发点时，弹出窗口内可操作提示。
  - 提供 `开始休息 / 延后 / 跳过` 行为。
- 严格模式：
  - 禁止延后与跳过，仅允许开始休息。
- 延后限制：
  - 按配置限制可延后次数，避免无限拖延。

### 3) 多屏策略
- 保留系统通知（辅助）。
- 增加“工作台窗口内提示卡”（主通道）：
  - 提示跟随当前 workspace 窗口所在屏幕展示；
  - 避免多屏场景下系统通知被忽略或用户感知不一致。

## UI 调整
- `WorkspaceFocusTimer.svelte`
  - 设置页新增：
    - 小休延后分钟
    - 长休延后分钟
    - 延后次数上限
    - 严格模式开关
- `WorkspaceFocusHub.svelte`
  - 新增 break prompt 卡片和动作按钮。

## UI 入口重构（2026-02-12 追加）
- 为避免“计时卡动作 + 提示卡动作”双入口造成认知负担，休息策略入口已收敛为独立控制条：
  - 新增 `WorkspaceBreakControlBar.svelte` 统一承载开始/延后/跳过；
  - 计时卡主操作仅保留开始/暂停、重置、设置；
  - `breakPrompt` 保留提醒语义，不再承担主操作入口。
- 窄宽窗口下，侧栏同步改为“分区折叠 + 分区独立滚动”。
- 详见：`docs/ui/2026-02-12-workspace-break-controls-sidebar-compact.md`

## 影响文件
- `src/lib/workspace/focus/focus-runtime.js`
- `src/lib/workspace/preferences-service.js`
- `src/lib/workspace/controllers/workspace-focus-actions.js`
- `src/lib/components/workspace/WorkspaceFocusHub.svelte`
- `src/lib/components/workspace/focus/WorkspaceFocusTimer.svelte`
- `src/lib/strings.js`
- `src/routes/workspace/+page.svelte`
- `src-tauri/src/preferences.rs`

## 验证
- `npm run check` 通过
- `cargo check` 通过

## 后续（Phase 3 已落地）
- 全局休息会话（30m/1h/2h/今天）与重启恢复已实现。
- 详见：`docs/ui/2026-02-12-workspace-stretchly-phase3-global-break-session.md`

## 2026-02-20 追加：全屏覆盖层倒计时（对齐 Stretchly）
- 触发休息后不再弹“是否休息”，改为直接进入休息倒计时。
- 覆盖层改为多屏全屏展示，底部动作固定为 `延后 2 分钟`，并在延后后才开放 `跳过`。
- 详细实现与交互矩阵见：
  - `docs/ui/2026-02-20-workspace-break-overlay-stretchly-fullscreen.md`
