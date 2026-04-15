# 「贴在底部」不立即下沉修复（2026-04-15）

## 判定
- 类型：`Bug/体验回归`

## 背景
- 现象：点击便笺的「贴在底部」后，窗口不会立刻沉到下层；需要用户再点一下其它窗口，便笺才被动落到后面。
- 后续补充现象：重新开启桌面贴纸、或将新的笔记钉到桌面时，非置顶贴纸仍可能回到上层。
- 后续补充现象：重新开启桌面贴纸、或新钉住一条笔记时，贴纸会明显闪动。
- 预期：用户点击「贴在底部」应立即生效，避免“看起来没反应”。

## 根因（Windows）
- 将窗口从 `topmost` 切回普通窗口时，如果它仍处于激活态，Windows 的 Z 顺序刷新可能要等到焦点变化才体现。
- `apply_note_window_layer_with_interaction_by_label()` 旧逻辑把 `鼠标交互开启` 也算作 `should_be_top`。
- 这导致 `sync_all_note_window_layers` 在新建、重新显示、重新同步贴纸时，会把 `is_always_on_top=false` 的贴纸重新提升到上层。
- 前端新增/恢复任意一个贴纸窗口后，会触发全量 `sync_all_note_window_layers` 重试；左下角开启桌面贴纸后还会再额外全量同步一次。
- 新贴纸窗口是先可见创建，再由全量同步补做 WorkerW 挂载。Windows 端重复 `SetParent` / `SetWindowPos` 会导致明显闪动，贴纸数量越多越明显。
- 进一步确认：只做 `SetParent` 不足以让 Tauri WebView 稳定进入 WorkerW 桌面层；窗口仍可能保留顶层 `WS_POPUP` 语义，表现为刚开启时贴底/置顶视觉层级交叉、需要点击其它窗口才刷新。
- 2026-04-15 追加确认：Windows 壁纸层并不是单纯的 `HWND_BOTTOM` 问题，它依赖 `Progman -> WorkerW` 的正确生成与发现。此前 `spawn_worker_w()` 使用了 `wParam=0`，与通用 WorkerW 方案和 `lively` 的 `wParam=0xD` 不一致，导致部分机器上“图标上层”可用，但“壁纸层 sibling WorkerW”无法稳定生成或发现。
- 2026-04-15 追加确认：Windows 11 某些桌面布局下，壁纸层 `WorkerW` 会直接作为 `Progman` 子窗口存在，而不一定能通过“拥有 `SHELLDLL_DefView` 的宿主窗口的下一个 sibling”拿到。
- 2026-04-15 追加确认：桌面层子窗口会失去 Windows 原生圆角观感，因此贴纸内容容器必须自己提供圆角裁剪，不能依赖顶层窗口默认圆角。

## 修复
- 将 Windows 层级判断收敛为：
  - `is_always_on_top=true`：置顶显示。
  - `is_always_on_top=false`：贴在底部/桌面层。
  - 鼠标交互只控制 click-through，不再覆盖置顶/底部语义。
- 新增 Win32 一次性下沉：
  - 文件：`src-tauri/src/platform/windows/window_style.rs`
  - `send_window_to_bottom_if_top_level()`：
    - 仅对顶层窗口生效（避免对子窗口/桌面附着窗口造成“压到图标下方”的副作用）。
    - 使用 `SetWindowPos(HWND_BOTTOM)` 且不带 `SWP_NOACTIVATE`，确保立即刷新 Z 顺序。
- 在用户主动点击「贴在底部」的动作中调用一次：
  - 文件：`src-tauri/src/desktop/sticky/mod.rs`
  - `toggle_z_order_and_apply()` 当 `is_always_on_top` 切到 `false` 时，one-shot 执行下沉。
- 新增单贴纸层级同步命令：
  - 文件：`src-tauri/src/desktop/sticky/mod.rs`
  - `sync_note_window_layer(id)` 只读取并应用目标笔记的层级，避免一个贴纸变化导致所有贴纸被重新挂载。
- 前端窗口同步改为单一显示入口：
  - 文件：`src/lib/panel/use-window-sync.js`
  - 新贴纸窗口创建时使用 `visible: false`。
  - `tauri://created` 后由 `use-window-sync` 先执行 `sync_note_window_layer(id)`，再 `show()`，再按同一 note 状态复核一次层级。
  - 贴纸页面不再负责首次 `show()`，避免面板和贴纸页两个入口抢窗口显示时序。
  - 后台只对当前贴纸做延迟重试，不再全量重排所有贴纸。
  - 普通面板与工作台面板开启桌面贴纸后不再额外调用全量同步。
- 开启/关闭桌面贴纸的入口收敛：
  - 开启时只调用 `loadNotes()`，由 `loadNotes()` 内部统一触发 `syncWindows()`。
  - 关闭时才直接调用 `syncWindows()` 关闭现有贴纸窗口。
  - 避免开启路径先后两次进入窗口同步，造成刚恢复时状态竞争。
- Windows WorkerW 挂载增加样式转换与幂等判断：
  - 文件：`src-tauri/src/platform/windows/workerw/mod.rs`
  - 挂到桌面层/壁纸层前，将窗口样式从 `WS_POPUP` 切到 `WS_CHILD`。
  - 从桌面层切回置顶显示时，将窗口样式从 `WS_CHILD` 切回 `WS_POPUP`。
  - 置顶路径先 detach 并恢复顶层窗口样式，再调用 `set_always_on_top(true)`，避免对子窗口状态直接设置 topmost。
  - 若窗口已经在目标父窗口下，不再重复 `SetParent`。
  - 桌面层继续使用 `HWND_TOP + SWP_NOACTIVATE` 放到图标上层；壁纸层继续使用 `HWND_BOTTOM`。
  - 目的：让 WorkerW 父子关系和 Win32 窗口样式一致，避免“父窗口已挂上但视觉上仍像顶层窗口”的混乱状态。
- WorkerW 生成与发现链路补强：
  - 文件：`src-tauri/src/platform/windows/workerw/discovery.rs`
  - `spawn_worker_w()` 改为对 `Progman` 发送 `0x052C(wParam=0xD)`，分别尝试 `lParam=0` 和 `lParam=1`。
  - `find_wallpaper_worker_w()` 在原有 sibling `WorkerW` 发现失败后，增加 `Progman -> child WorkerW` 回退，覆盖 Windows 11 常见桌面布局。
  - 目的：先保证“壁纸层容器”本身是对的，再谈窗口样式和 Z 顺序。
- 便笺窗口 hover 工具栏显隐收敛：
  - 文件：`src/routes/note/[id]/+page.svelte`、`src/lib/components/note/NoteToolbar.svelte`
  - `note-window` 增加 `data-toolbar-visible` 状态，只在 `clickThrough=false` 且 `isWallpaper=false` 时允许 hover 显示工具栏。
  - 贴纸根容器改为 `width/height: 100%` 铺满父容器，并用 `12px` 圆角 + `::before` 继承圆角裁剪，避免桌面层/壁纸层子窗口出现方角、两侧透明宿主边缘或“背景没有贴满外框”的观感。

## 回归关注点
1. 「置顶显示」仍应立即上浮，不受影响。
2. 重新关闭/开启桌面贴纸后，非置顶贴纸仍保持底部语义。
3. 新钉住笔记默认按 `is_always_on_top=false` 进入底部/桌面层。
4. 鼠标交互开关只影响可点/不可点，不应把非置顶贴纸重新置顶。
5. 新增贴纸或批量开启桌面贴纸时，不应出现所有贴纸连续闪动。
6. 刚开启桌面贴纸后，初始层级应立即符合每条 note 的 `is_always_on_top` / `is_wallpaper` 状态，不需要再手动点一次按钮修正。
7. Windows 上切换到「贴到壁纸层」时，贴纸必须真正进入图标下方，而不是仍停留在图标上层。
8. 贴在底部时，贴纸仍应保持圆角外观，不应出现左右透明宿主边缘。
9. 悬浮编辑按钮只应在鼠标交互开启时显示。
