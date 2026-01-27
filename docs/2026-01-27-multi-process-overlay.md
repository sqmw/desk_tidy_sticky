# 2026-01-27 — 多屏 Overlay：多进程方案

## 目标
- 解决单窗口覆盖“虚拟屏幕”带来的多屏负坐标/DPI/任务栏遮挡问题。
- 让每个显示器有独立的 Overlay 窗口，便于 WorkerW 嵌入和故障隔离。

## 方案（推荐）
- 每个显示器启动 1 个 overlay 子进程：`desk_tidy_sticky.exe --mode=overlay --child --monitor-rect=L,T,W,H`
- Panel 主进程负责：
  - 枚举显示器；
  - 启停 overlay 子进程；
  - 通过 stdin JSON IPC 下发：语言、穿透、刷新、关闭等指令。
- Overlay 子进程负责：
  - 只渲染 pinned notes；
  - 可选 WorkerW 嵌入（`--embed-workerw`）；
  - 默认可配置 click-through；面板/托盘手动打开时默认关闭穿透，便于直接编辑。
  - 通过热键/IPC 切换穿透（Ctrl+Shift+O / `set_click_through`）。

## 关键实现
- 显示器枚举：`lib/services/display_service.dart`（Win32 EnumDisplayMonitors）。
- 进程管理：`lib/services/overlay_process_manager.dart`
  - `startAll/stopAll/toggleClickThroughAll/refreshAll/closeAll`
  - 进程启动使用 `detachedWithStdio`，保留 stdin 发送控制指令。
- IPC 指令（stdin JSON）：
  - `{"cmd":"set_language","value":"zh|en"}`
  - `{"cmd":"set_click_through","value":true|false}`
  - `{"cmd":"refresh_notes"}`
  - `{"cmd":"close_overlay"}`

## 回退策略
- 若显示器枚举/子进程启动失败，回退到单进程 overlay route（虚拟屏幕大窗口方案）。
