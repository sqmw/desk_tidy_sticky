# Windows「图标上层 / 壁纸层」语义修复（2026-04-14）

## 判定
- 类型：`Bug/回归`

## 背景
- 产品语义是两条独立层级：
1. `贴在图标上层`：贴纸在桌面图标之上（可见于桌面），但不应等同于壁纸层。
2. `贴到壁纸层`：贴纸在桌面图标之下。
- 现象是 Windows 端两者表现接近，用户难以感知差异。

## 根因
- Windows 端 `desktop layer` 与 `wallpaper layer` 的 WorkerW 发现逻辑过于接近：
1. `find_desktop_worker_w()` 和 `find_wallpaper_worker_w()` 都优先拿到 `SHELLDLL_DefView` 后继 WorkerW。
2. 这会让两条路径经常落在同一父窗口，层级语义被压扁。
- 同时 `attach_to_worker_w()` 在附着后统一执行 `HWND_BOTTOM`，进一步把“图标上层”压到接近“壁纸层”。
- 2026-04-15 追加确认：当窗口已经挂到 `wallpaper WorkerW` 后，再对子窗口执行 `HWND_BOTTOM` 会把贴纸压到该父层的更底部，用户体感就是“点了贴到壁纸层后直接消失”。

## 修复
### 1. desktop layer 改为绑定图标宿主窗口
- 文件：`src-tauri/src/platform/windows/workerw/discovery.rs`
- `find_desktop_worker_w()` 调整为优先返回 `SHELLDLL_DefView` 的宿主窗口（`Progman` 或 `WorkerW`），而不是后继 wallpaper WorkerW。

### 2. desktop layer 的附着后层级策略改为上浮到宿主子窗口前层
- 文件：`src-tauri/src/platform/windows/workerw/mod.rs`
- 新增 `force_desktop_layer_immediately()`：
  - `SetWindowPos(..., HWND_TOP, ..., SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW)`
- `attach_to_worker_w()` 改为调用 `force_desktop_layer_immediately()`，不再统一 sink 到 `HWND_BOTTOM`。

### 3. wallpaper layer 失败回退不再误走 desktop layer
- 文件：`src-tauri/src/platform/windows/workerw/mod.rs`
- `attach_to_wallpaper_worker_w()` 在 wallpaper WorkerW 初始化/附着失败时，改为：
  - 回退到 desktop parent + `HWND_BOTTOM`（保守保持“底层”语义），而不是转调 `attach_to_worker_w()`。

### 4. wallpaper layer 附着后保持在壁纸层父窗口前侧
- 文件：`src-tauri/src/platform/windows/workerw/mod.rs`
- 新增 `force_wallpaper_layer_immediately()`：
  - `SetWindowPos(..., HWND_TOP, ..., SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW)`
- `attach_to_wallpaper_worker_w()` 成功附着到 wallpaper WorkerW 后，改为调用 `force_wallpaper_layer_immediately()`。
- 目的：
  - wallpaper WorkerW 自身已经处于桌面图标下方；
  - 贴纸只需要位于该父窗口前侧即可可见，不应继续沉到该父层最底部。

## 结果
- Windows 下两条语义重新分离：
1. `贴在图标上层`：附着到图标宿主层并保持图标上层语义。
2. `贴到壁纸层`：附着 wallpaper WorkerW，并保持在该父层前侧，因此位于图标下方但不会直接消失。

## 回归关注点
1. 同一张贴纸在两种模式之间切换时，层级差异应可见。
2. `贴到壁纸层` 仍应保持不可交互策略（前端已有 `isWallpaper => ignore cursor`）。
3. 多显示器、Explorer 重启后，层级同步命令 `sync_all_note_window_layers` 是否能恢复正确父层。
