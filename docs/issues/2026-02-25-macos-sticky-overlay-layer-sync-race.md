# macOS 贴纸显示“点击无反应”层级同步竞态修复（2026-02-25）

## 判定
- 类型：`Bug/回归`

## 现象
- 在工作台点击“桌面贴纸”后，用户体感“没有反应”，贴纸未按预期出现在桌面层。

## 根因
- 贴纸窗口创建与“层级同步”之间存在时序竞态：
  - 新建窗口后，原逻辑未对 `sync_all_note_window_layers` 做创建后重试同步；
  - 在 macOS 下，窗口句柄就绪时机可能略晚于 webview 创建事件，导致首轮层级应用时机不稳定。
- 结果：窗口已创建，但层级未及时切换到预期桌面策略，表现为“点了没反应”。
- 另一个可见性问题：
  - `DesktopWindowLevel` 分支使用 `orderBack`，在部分 macOS 场景下会把贴纸压到桌面背景窗口后面，体感为“开启无响应”。

## 修复策略
- 在贴纸窗口同步器内增加“层级同步重试机制”：
  - 仅当本轮 `syncWindows()` 实际新建了贴纸窗口时触发；
  - 按延迟序列重试调用 `sync_all_note_window_layers`（`40ms / 160ms / 360ms`）；
  - 避免将该重试挂到所有刷新路径，减少不必要层级抖动风险。
- 在“桌面贴纸”开关开启路径增加显式层级同步：
  - 主面板与工作台在 `toggleStickiesVisibility()` 成功后（开启分支）主动调用 `sync_all_note_window_layers`；
  - 覆盖“窗口已存在但层级未刷新”的场景，保证用户点击后有可见反馈。
- 修正 macOS 桌面层窗口排序策略：
  - 非交互桌面模式仍保持 `DesktopWindowLevel`；
  - 但窗口排序从 `orderBack` 调整为 `orderFront`（同低层级前置），避免被壁纸/背景窗口吞掉可见性。

## 代码变更
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/panel/use-window-sync.js`
  - 新增 `syncAllNoteLayersWithRetry()`
  - 新增重试参数：`LAYER_SYNC_RETRY_DELAYS_MS = [40, 160, 360]`
  - `syncWindows()` 在 `createdWindowCount > 0` 时触发层级重试同步
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/+page.svelte`
  - `toggleStickiesVisibility()` 开启贴纸后显式调用 `sync_all_note_window_layers`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/workspace/+page.svelte`
  - `toggleStickiesVisibility()` 开启贴纸后显式调用 `sync_all_note_window_layers`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/macos_windows.rs`
  - `attach_to_worker_w_with_mode(interactive=false)` 改为 `DesktopWindowLevel + orderFront`

## 回归验证
1. 保持至少 1 条 `isPinned = true` 贴纸。
2. 在工作台点击“桌面贴纸”开启。
3. 期望：贴纸窗口可见性与层级行为稳定，不再出现“点击无响应”的体感。
4. 再切换“桌面贴纸”关闭/开启多次，确认行为一致。
5. 在“鼠标交互：关”下，贴纸应仍可见（仅不可点），不应整块消失。
