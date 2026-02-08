# 2026-02-07 WorkerW Attach Win32 Error 87

## Symptom
- 前端报错：`toggleZOrder SetParent attach failed with Win32 error 87`
- 场景：切换贴纸置顶/置底时，调用 `attach_to_worker_w` 偶发失败。

## Root Cause
- Windows 桌面层窗口（WorkerW）在某些时机可能重建或句柄短暂失效。
- 代码首次 `SetParent(hwnd, WORKER_W)` 命中无效参数（87），直接失败返回。

## Fix
文件：`src-tauri/src/windows.rs`

- 在 `attach_to_worker_w` 增加一次性重试策略：
  1. 首次 attach 失败且错误含 `Win32 error 87`；
  2. 重新执行 `init_worker_w()` 刷新 WorkerW；
  3. 重新应用样式并 `SetParent` 再试一次。
- 其余错误维持原行为（不盲目重试）。

## Follow-up (Detach path)
- 追加修复：`SetParent detach failed with Win32 error 0`
- 原因：
  - 从 WorkerW 脱离时，窗口样式刷新与 `SetParent(NULL)` 存在瞬态失败。
- 处理：
  - `detach_from_worker_w` 新增 `apply_popup_style_and_detach(...)`，先做样式刷新再执行 detach 校验。
  - 对 `Win32 error 0/87` 做一次重试（其余错误不重试）。
- 效果：
  - `toggleZOrder` 在置底 -> 置顶切换时稳定性提升，减少前端报错。

## Follow-up (Multi-WorkerW + Bottom Fallback)
- 新要求：
  1) 不能只尝试一个 WorkerW；  
  2) attach WorkerW 全失败时，要有最底层兜底。

- 实现（`src-tauri/src/windows.rs`）：
  - 新增 WorkerW 候选收集：
    - 保留当前 `WORKER_W`；
    - 再枚举所有 `WorkerW` 作为候选列表，去重后逐个尝试。
  - `attach_to_worker_w` 策略升级：
    1. 首轮：遍历全部候选 WorkerW attach；  
    2. 若全失败：重新 `init_worker_w()` 后再遍历一轮；  
    3. 仍失败：执行兜底 `apply_global_bottom_fallback`（`NOTOPMOST + HWND_BOTTOM`，并去掉 parent/恢复 popup 样式）。

- 结果：
  - 不再依赖单一 WorkerW 句柄。
  - WorkerW attach 异常时窗口仍会落到全局底层，不阻断业务流程。

## Follow-up (Top/Bottom click no-op hardening)
- 现象：
  - 点击“置顶/置底”偶发无效，前端仅报错。
- 加固：
  1. `detach_from_worker_w` 失败时新增兜底：
     - 强制顶层窗口样式（清 parent + `WS_POPUP`）；
     - 直接 `HWND_TOPMOST`，保证“切到置顶”至少可见生效。
  2. `toggle_z_order_and_apply` 不再因切层失败直接返回 `Err`：
     - 记录日志；
     - 仍返回已更新的 note 状态并发出 `notes_changed`。
- 效果：
  - UI 不再因为一次 Win32 切层失败而“点了没反应”。
  - 置顶/置底切换可见性显著提升。

## Impact
- 切换置顶/置底的稳定性提升，减少偶发性 `SetParent` 失败。
- 不改变既有层级策略，仅增强 WorkerW 绑定容错。
