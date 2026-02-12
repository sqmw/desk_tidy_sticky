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
