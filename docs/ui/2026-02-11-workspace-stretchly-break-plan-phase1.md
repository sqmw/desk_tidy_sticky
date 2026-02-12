# Workspace 专注模块：Stretchly 风格休息计划（Phase 1）

## 背景与目标
- 将 Stretchly 的核心价值（定时小休/长休 + 提前提醒）并入现有番茄模块。
- 避免新增平行计时系统，统一挂载到已有 `WorkspaceFocusHub` 运行循环。

## 本次范围（MVP）
1. 双阶段休息计划
   - 小休：默认每 10 分钟，休息 20 秒
   - 长休：默认每 30 分钟，休息 5 分钟
2. 提前提醒
   - 默认提前 10 秒通知
   - 支持配置为 `0~120` 秒

## 架构与实现
### 1) 配置模型扩展
- `pomodoroConfig` 新增字段（前后端同名）：
  - `miniBreakEveryMinutes`
  - `miniBreakDurationSeconds`
  - `longBreakEveryMinutes`
  - `longBreakDurationMinutes`
  - `breakNotifyBeforeSeconds`

### 2) 运行时接入（不新起平行引擎）
- 在 `WorkspaceFocusHub.svelte` 中，沿用现有秒级 tick：
  - 只在 `PHASE_FOCUS && running` 时累加 `focusSinceBreakSec`
  - 基于当前配置维护：
    - `nextMiniBreakAtSec`
    - `nextLongBreakAtSec`
    - `nextMiniWarnAtSec`
    - `nextLongWarnAtSec`
- 到达提醒点后发送系统通知，并进行去重，防止同一阈值重复弹出。
- 进入非专注阶段时，重置连续专注计数与休息计划锚点。

### 3) 通知能力封装
- 新增 `src/lib/workspace/focus/focus-break-notify.js`
  - 统一处理通知权限与发送
  - 提供秒数文本格式化函数，减少组件内细节耦合

## UI 调整
- `WorkspaceFocusTimer.svelte`
  - 展示“下次小休/下次长休”倒计时
  - 展示提醒状态（已开启/未开启）
  - 设置面板新增 5 个休息相关配置项

## 持久化链路
- 前端：
  - `preferences-service.js` 归一化、默认值、加载映射已扩展
  - `workspace-focus-actions.js` 保存偏好时写入新增键
- 后端：
  - `src-tauri/src/preferences.rs` 的 `PanelPreferences` 新增对应字段与默认函数

## 风险与注意点
- 通知依赖系统权限；若用户拒绝通知，提醒状态会显示未开启，计时逻辑仍正常。
- 本阶段先做“提醒”，未做强制休息覆盖层（Strict 模式将在下一阶段实现）。

## 影响文件
- `src/lib/workspace/focus/focus-runtime.js`
- `src/lib/workspace/focus/focus-break-notify.js`（新增）
- `src/lib/workspace/preferences-service.js`
- `src/lib/workspace/controllers/workspace-focus-actions.js`
- `src/lib/components/workspace/WorkspaceFocusHub.svelte`
- `src/lib/components/workspace/focus/WorkspaceFocusTimer.svelte`
- `src/lib/strings.js`
- `src/routes/workspace/+page.svelte`
- `src-tauri/src/preferences.rs`
