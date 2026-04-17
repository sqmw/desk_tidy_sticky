# macOS 置顶窗口在全屏场景下失效

## 判定

`Bug / 回归`

当前 macOS 上两类置顶窗口都会受影响：

- mini 窗口的“窗口置顶”
- 贴纸的“置顶显示”

它们在普通窗口场景可见，但当其他应用进入全屏时，无法继续保持在上层。

## 根因

两条链路虽然入口不同，但最终都会走同一个 macOS 原生置顶函数：

- `macos::set_topmost_no_activate`

问题不在于“有没有设置 topmost”，而在于全屏 Space 场景下需要更高的窗口层级。  
此前实现提升到 `OverlayWindowLevel` 后，仍存在“在其他应用全屏时置顶窗口不可见”的反馈，需要进一步上探窗口层级。

## 修复

修复分两部分：

### macOS

1. mini 窗口继续通过后端命令 `set_panel_window_pinned` 统一走原生置顶链路。  
2. 更关键的是，把 `macos::set_topmost_no_activate` 的窗口层级从：

- `OverlayWindowLevel`

进一步提升为：

- 接近 `ScreenSaverWindowLevel`（比休息遮罩层低一级）

同时补充和保留以下 traits：

- `CanJoinAllSpaces`
- `FullScreenAuxiliary`

说明：

- `CanJoinAllSpaces` 不能与 `MoveToActiveSpace` 同时设置，macOS 会直接抛出 `NSInternalInconsistencyException`
- 因此这里保留 `CanJoinAllSpaces + FullScreenAuxiliary` 组合，不再叠加 `MoveToActiveSpace`

这样 mini 和贴纸两类“置顶窗口”都会一起恢复。

另外，panel / mini 窗口在置顶时还会显式打开：

- `set_visible_on_all_workspaces(true)`

取消置顶时再关闭。  
这是因为普通 panel 窗口不像贴纸那样天然附着在自定义桌面层级，除了原生 `NSWindow` level，还需要显式允许跨 Space 可见。

### Windows

同步走已有的原生顶层 API：

- `SetWindowPos(HWND_TOPMOST / HWND_NOTOPMOST)`

保持 panel 置顶行为与现有原生窗口逻辑一致。

## 影响范围

本次修复会同时影响：

- mini / panel 的“窗口置顶”
- 贴纸的“置顶显示”

## 回归验证

已完成：

1. `cargo check --manifest-path src-tauri/Cargo.toml`
2. `pnpm check`

建议人工补充验证：

1. macOS 打开 mini 窗口并开启“窗口置顶”。
2. 再将某张贴纸切到“置顶显示”。
3. 切到任意全屏应用。
4. 确认 mini 和置顶贴纸都仍能显示在全屏内容上层。
