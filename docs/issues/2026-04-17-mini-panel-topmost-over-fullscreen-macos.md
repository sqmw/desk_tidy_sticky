# macOS 置顶窗口在全屏场景下失效（历史记录）

## 判定

`Bug / 回归`

当前历史问题原本影响两类置顶窗口：

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

1. 更关键的是，把 `macos::set_topmost_no_activate` 的窗口层级从：

- `OverlayWindowLevel`

进一步提升为：

- `ScreenSaverWindowLevel`

并将休息遮罩层提升到更高层级：

- `AssistiveTechHighWindowLevel`

同时补充和保留以下 traits：

- `CanJoinAllSpaces`
- `FullScreenAuxiliary`

说明：

- `CanJoinAllSpaces` 不能与 `MoveToActiveSpace` 同时设置，macOS 会直接抛出 `NSInternalInconsistencyException`
- 因此这里保留 `CanJoinAllSpaces + FullScreenAuxiliary` 组合，不再叠加 `MoveToActiveSpace`

当前产品已经移除了 mini 主窗口的“窗口置顶”入口，因此这里主要保留为历史排查记录；当前仍适用的对象是贴纸“置顶显示”。

### Windows

同步走已有的原生顶层 API：

- `SetWindowPos(HWND_TOPMOST / HWND_NOTOPMOST)`

## 影响范围

当前文档对应的有效影响范围为：

- 贴纸的“置顶显示”

## 回归验证

已完成：

1. `cargo check --manifest-path src-tauri/Cargo.toml`
2. `pnpm check`

建议人工补充验证：

1. macOS 将某张贴纸切到“置顶显示”。
2. 切到任意全屏应用。
3. 确认置顶贴纸仍能显示在全屏内容上层。
