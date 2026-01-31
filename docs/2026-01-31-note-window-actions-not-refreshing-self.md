# 贴纸窗口：操作后主界面已同步，但贴纸自身不刷新

## 现象
- 在桌面贴纸窗口里点击：置顶/置底、完成、编辑、取消钉住等操作后：
  - 主界面（Panel）能正确同步状态；
  - 但贴纸窗口自身 UI / z-order 不更新，表现为图标状态不对、置顶置底不生效、需要等待外部刷新。

## 根因
- 跨窗口同步使用 `WindowMessageService.sendToAll('refresh_notes')`。
- `sendToAll` 内部会跳过“当前 engine 的窗口”（`controller.windowId == _windowController.windowId`），
  所以 **贴纸窗口自己触发的 refresh 广播不会回到自己**。
- 结果：操作发生在贴纸窗口时，只有其它窗口（比如 Panel）收到了 refresh；贴纸窗口自身没有触发 `_loadNote()`。

## 额外问题：其它贴纸跟着“闪一下”
- 即使只想通知主窗口刷新，如果通过 `WindowController.getAll()` + `arguments` 解析来筛选“panel”，
  在部分环境里可能取不到其它窗口的 `arguments`（会被当成默认 panel），导致 `refresh_notes` 误发给其它贴纸窗口 -> 看起来像“闪一下”。

## 修复
- 在贴纸窗口执行本地操作后，额外触发一次本地刷新：`IpcController.requestRefresh()`。
  - 贴纸窗口本身已监听 `IpcController.refreshTick`，因此会立即走 `_loadNote()` 并重建 UI / 重新应用 z-order。
  - 同步通知改为只发给主窗口：`WindowMessageService.sendToPrimaryPanel('refresh_notes')`（避免误判导致其它贴纸窗口无意义刷新）。
- `refresh_notes/close_overlay` 这类 IPC 事件不再使用“全局 ValueNotifier”广播；改为按窗口 scope 分流（panel / note:<id> / overlay:<layer>），避免某个窗口触发刷新导致其它贴纸也收到刷新 tick。
- 从“贴在底部(WorkerW)”切回“置顶显示”时，需要先 `detachFromWorkerW`，否则即使调用 `AlwaysOnTop` 也可能仍被 WorkerW 约束导致“看起来毫无效果”。
- “取消钉住”后主界面不刷新：原因是关闭窗口过快导致异步广播未必送达；改为 `await sendToPanels(...)` 后再关闭。

## 影响文件
- `lib/pages/note_window/note_window_page.dart`
