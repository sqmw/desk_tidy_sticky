# 2026-02-07 - WorkerW attach(87) + 重复窗口 + 贴纸编辑拖动策略修复

## 背景问题
- `sync_all_note_window_layers failed SetParent attach failed with Win32 error 87`。
- 前端出现 `a webview with label note-xxx already exists`。
- 贴纸拖动与编辑冲突：容易误改内容，且拖动区域不符合预期。
- 置顶/置底图标识别度低。

## 本次修复

### 1) WorkerW 挂载稳定性
文件：`src-tauri/src/windows.rs`

- 新增 `set_parent_checked()`，不再仅依赖 `SetParent` 返回值判断成功。
  - 调用 `SetParent` 后通过 `GetParent(hwnd)` 二次校验。
- 在 attach/detach 前统一清理 owner：`SetWindowLongPtrW(hwnd, GWLP_HWNDPARENT, 0)`。
- attach/detach 后 `SetWindowPos` 增加 `SWP_FRAMECHANGED`，强制窗口样式刷新。
- attach 时增加窗口句柄有效性判断（`IsWindow`），并在缓存 `WORKER_W` 失效时自动重建。

### 2) 重复创建 note window（label already exists）
文件：`src/lib/panel/use-note-commands.js`、`src/lib/panel/use-window-sync.js`

- `togglePin()` 去掉“`loadNotes()` 之后再次手动开/关窗口”的重复逻辑。
  - 统一由 `loadNotes() -> syncWindows()` 管理窗口增删。
- `syncWindows()` 增加串行锁 `syncInFlight`，避免并发同步造成竞态创建。

### 3) 贴纸编辑/拖动行为（按需求收敛）
文件：`src/routes/note/[id]/+page.svelte`

- 仅允许通过“编辑按钮”进入编辑态（移除双击正文进入编辑）。
- 非编辑态：正文区与底栏空白可拖动；图标按钮不可拖动。
- 编辑态：仅底栏空白可拖动。
- 进入编辑态时自动关闭颜色/透明度弹层，避免编辑干扰。

### 4) 图标美化（置顶/置底）
文件：`src/routes/note/[id]/+page.svelte`、`src/lib/components/panel/NotesSection.svelte`

- 将置顶/置底图标替换为分层语义更明确的线性图标。
- 增加 active 样式（颜色、边框、背景）提升状态辨识度。

## 验证
- `cargo check`：通过。
- `npm run build`：通过。

## 仍需你本机重点回归
1. 切换「置顶/置底」后，用 Spy++ 确认 note 窗口父子链是否进入目标 WorkerW。
2. 验证桌面图标层级：置底便签应在图标下方，不应浮在图标上。
3. 高频操作：快速 pin/unpin + 切换置顶/置底，确认不再出现 `already exists`。

## 追加修复（同日）: handle unavailable + 拖动卡顿

### 问题
- 控制台报错：`sync_all_note_window_layers failed the underlying handle is not available`。
- 贴纸拖动卡顿。

### 处理

#### 1) `sync_all_note_window_layers` 句柄不可用降级
文件：`src-tauri/src/lib.rs`

- `apply_note_window_layer_by_label()` 在获取 `w.hwnd()` 时：
  - 若报错包含 `underlying handle is not available`，视为窗口生命周期瞬时状态，直接 `Ok(())` 跳过。
  - 其它错误仍按失败返回。
- `sync_all_note_window_layers()` 改为 best-effort：单个窗口失败不再中断整批同步。

#### 2) 拖动改回原生 drag-region（降低抖动/卡顿）
文件：`src/routes/note/[id]/+page.svelte`

- 移除 JS `startDragging()` 逻辑与 `onmousedown` 全局拦截。
- 使用 Tauri 原生 `data-tauri-drag-region`：
  - 非编辑态：正文区 `preview-text` 可拖动。
  - 编辑态：正文是 `textarea`，不可拖动。
  - 底栏新增 `toolbar-drag-pad` 空白拖动区，始终可拖。
- 保留按钮可点击，不参与拖动。

### 验证
- `cargo check`：通过。
- `npm run build`：通过。

## 追加修复（同日-2）: 置底拖动卡顿

### 新发现
- 用户反馈：仅在“非置顶（置底/WorkerW）”状态拖动卡顿；置顶拖动正常。

### 根因
- 置底窗口被 reparent 到 WorkerW 后属于子窗口语义，直接拖动会出现卡顿/不顺滑。

### 修复策略
文件：`src/routes/note/[id]/+page.svelte`

- 拖动开始时（仅对 `isAlwaysOnTop=false`）：
  1. 临时调用 `apply_note_window_layer(isAlwaysOnTop=true)` 切到顶级拖动层；
  2. `startDragging()`；
  3. 拖动结束后调用 `applyZOrderAndParent([0,120])` 自动恢复原有置底层级。
- `isAlwaysOnTop=true` 的便签维持原拖动流程，不做额外切层。
- 保留交互规则：
  - 非编辑态：正文/底栏空白可拖；
  - 编辑态：仅底栏空白可拖。

### 验证
- `cargo check`：通过。
- `npm run build`：通过。

## 追加修复（同日-3）: 透明度交互 + 主窗/贴纸状态同步 + 置底禁交互

### 1) 透明度改为滑动调节（支持滚轮）
文件：`src/routes/note/[id]/+page.svelte`

- 透明度面板由“离散按钮”改为 `range` 滑条（0.35~1.0，步进 0.01）。
- 支持滚轮微调（每次 0.02）。
- 透明度百分比数字只在滚轮操作时短暂显示（约 800ms 自动隐藏）。
- 透明度写入采用短延迟合并（80ms）避免频繁落盘。

### 2) 主窗口与贴纸窗口状态同步
文件：`src-tauri/src/lib.rs`、`src/routes/+page.svelte`、`src/routes/note/[id]/+page.svelte`

- 后端新增统一事件：`notes_changed`。
- 所有便签写操作命令成功后都 emit `notes_changed`：
  - add/update/text/color/opacity/pin/done/archive/delete/restore/empty/reorder/z-order/position。
- 主窗口监听 `notes_changed` 后节流刷新列表（80ms）。
- 贴纸窗口监听 `notes_changed` 后重载自身 note 并同步按钮状态与层级。

### 3) 置底（WorkerW）禁交互
文件：`src/routes/note/[id]/+page.svelte`

- 新增策略：`isAlwaysOnTop=false` 时视为 `isBottomLocked`。
- `isBottomLocked` 下强制 `setIgnoreCursorEvents(true)`，贴纸不再可编辑/拖动/点击按钮。
- 工具栏仅在 `isAlwaysOnTop=true` 时渲染。

### 验证
- `cargo check`：通过。
- `npm run build`：通过。

## 追加修复（同日-4）: ignore-cursor 权限 + detach 误报 error 0

### 问题1
- 报错：`window.set_ignore_cursor_events not allowed`。

### 修复
文件：`src-tauri/capabilities/default.json`
- 增加权限：`core:window:allow-set-ignore-cursor-events`。

### 问题2
- 报错：`SetParent detach failed with Win32 error 0`。

### 根因
- detach 校验逻辑把目标父窗口固定为 DesktopWindow。
- 实际把窗口恢复为顶级窗口时，`GetParent(hwnd)` 通常为 `NULL`，导致“操作成功但校验失败”，并且 `GetLastError=0`。

### 修复
文件：`src-tauri/src/windows.rs`
- `set_parent_checked()` 增加 `expected_parent=NULL` 分支：允许 `GetParent(hwnd)==NULL` 视为成功。
- `detach_from_worker_w()` 改为 `SetParent(hwnd, NULL)` 语义校验，不再按 DesktopWindow 严格匹配。

### 验证
- `cargo check`：通过。
- `npm run build`：通过。
