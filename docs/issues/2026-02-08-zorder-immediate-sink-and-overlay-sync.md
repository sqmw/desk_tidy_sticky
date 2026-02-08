# 2026-02-08 置底立即下沉与交互状态同步修复

## 现象
1. 单条贴纸从置顶切到置底后，不会立刻下沉，常常需要再点击其它窗口才逐步下去。  
2. 贴纸窗口内的“鼠标交互”切换与主面板顶部状态可能不一致。  
3. 新开贴纸窗口时，初始交互状态偶发与全局状态不一致。

## 根因
1. Win32 置底路径使用了 `SWP_NOACTIVATE`，导致活跃窗口从 topmost 降级时视觉下沉延迟。  
2. 贴纸窗口页未在挂载时主动读取全局 `overlay interaction` 状态。  
3. 贴纸窗口内交互按钮只改本地状态，不走全局命令，主窗口与其它贴纸无法同步。

## 修复方案
### 1) 置底下沉改为“立即执行”
- 文件：`src-tauri/src/windows.rs`
- 调整点：
  - `force_bottom_no_activate` 改为 `force_bottom_immediately`，置底时去掉 `SWP_NOACTIVATE`。  
  - `set_topmost_no_activate(false)` 分支去掉 `SWP_NOACTIVATE`，保证从 topmost 降级即时可见。  
  - 贴底挂载（包括 fallback）统一走 `force_bottom_immediately`。

### 2) 全局交互默认值与贴纸默认层级一致
- 文件：`src-tauri/src/lib.rs`
- 调整点：
  - `OverlayInputState::default()` 改为 `true`（默认 click-through）。  
  - 结果：新钉到桌面的贴纸默认按“置底策略”运行，符合“默认非置顶”的产品规则。

### 3) 贴纸窗口交互改为全局同步
- 文件：`src/routes/note/[id]/+page.svelte`
- 调整点：
  - 新增 `loadOverlayInteractionState()`，挂载时先读取 `get_overlay_interaction`。  
  - `toggleMouseInteraction()` 改为调用 `toggle_overlay_interaction`，不再只改本地变量。  
  - 切换后立即重应用 `applyInteractionPolicy()` 与 `applyZOrderAndParent()`，保证反馈及时。

## 结果
1. 单条贴纸切到“贴在底部”时可立即下沉，不再依赖额外点击。  
2. 主面板与贴纸窗口的交互状态保持一致。  
3. 贴纸窗口新建时会对齐全局交互状态，减少状态漂移。

## 本地验证
1. `cargo check` 通过（仅有既有未使用项 warning，无新增错误）。  
2. `npm run check` 通过（`svelte-check` 0 errors / 0 warnings）。
