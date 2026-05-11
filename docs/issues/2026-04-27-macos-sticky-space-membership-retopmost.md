# macOS 贴纸置底后再置顶无法覆盖全屏窗口：保留 Space membership（2026-04-27）

## 判定
- `Bug / 回归`

## 背景
- 现象：
  - app 初始启动时，已经处于 `置顶显示` 的贴纸可以覆盖全屏窗口。
  - 先切到 `贴在底部`，再切回 `置顶显示` 后，同一张贴纸无法覆盖已有全屏窗口。
- 已尝试并撤销的方向：
  - 单纯调整 topmost `collectionBehavior`
  - 给普通 `NSWindow` 增加 panel style mask
  - 同步 Tauri/tao always-on-top 状态

## 重新判断
- 初始启动正常，说明“窗口一开始具备全屏 Space 资格再展示”这条链路可行。
- 运行时失败，更像是贴纸在进入桌面层时被移出了全屏 Space 资格；之后再热切回 topmost 时，AppKit 没有把同一个已存在窗口重新挂回已有的全屏 Space。
- 参考 `lencx/ChatGPT` 后确认，其运行时置顶主要依赖 Tauri 的 `set_always_on_top`，但该实现只到 floating level，不覆盖本项目的“全屏上方贴纸”需求；因此本项目仍需要保留 AppKit 层级策略。

## 本轮处理
- 文件：`src-tauri/src/platform/macos.rs`
  - macOS 桌面/壁纸层贴纸不再使用 `FullScreenNone`。
  - 改为继续保留：
    - `CanJoinAllSpaces`
    - `FullScreenAuxiliary`
    - `Stationary`
    - `IgnoresCycle`
  - 视觉上仍通过 desktop/window level 控制它处于底层。

- 文件：`src-tauri/src/desktop/sticky/layer.rs`
  - macOS 从底层切回 topmost 时，不再先调用 `detach_from_worker_w`。
  - 避免经过 `Default collectionBehavior + Normal level` 的中间态，把已有 Space membership 再次打断。

## 为什么这样改
- 这不是窗口重建，也不是 show/hide/focus 时序补丁。
- 本轮收敛的核心是：不要在“贴在底部”这个视觉状态里破坏贴纸作为 pinned overlay 的 Space membership。
- 桌面层和 topmost 层的差异，交给 `level` 与鼠标穿透处理，而不是通过移除 fullscreen space 资格处理。

## 验证路径
1. 启动 app，确认初始 `置顶显示` 贴纸可覆盖全屏窗口。
2. 切到 `贴在底部`。
3. 再切回 `置顶显示`。
4. 确认贴纸是否能重新覆盖已有全屏窗口。

## 验证结果
- 2026-04-27 用户在 macOS 上按原复现路径测试通过。
- 结论：保留桌面层贴纸的 fullscreen Space membership，并取消回顶层前的 `detach_from_worker_w` 中间态，可以修复该回归。

## 2026-05-11 重构方向：改为 panel-backed sticky
- 经过多轮验证后，问题被收窄为：
  - `置顶 -> 置底 -> 置顶` 正常
  - `取消钉住 -> 再钉住` 失败
- 这说明核心问题不在普通 z-order 切换，而在 **pinned sticky 的窗口生命周期**。
- 原有 `NSWindow` 方案在“取消钉住后关闭窗口，再钉住后重建同 label 窗口”这条链上，不能稳定恢复 fullscreen overlay 资格。

### 参考实现调研结论
- `keyviz`：
  - 只是单一 overlay 窗口，mac 侧主要依赖 `setLevel_ + CanJoinAllSpaces`
  - 生命周期简单，不覆盖“贴纸反复 pin/unpin 重建”的复杂场景
- `tauri-nspanel fullscreen example`：
  - 明确把 `WebviewWindow` swizzle 成 `NSPanel`
  - 使用：
    - `NSWindowStyleMaskNonActivatingPanel`
    - `FullScreenAuxiliary`
    - `CanJoinAllSpaces`
  - 官方示例明确面向“可显示在 fullscreen window 上方”的场景

### 当前方案
- macOS pinned sticky 创建后立即转成 `NSPanel`
- 之后仍沿用现有 level / interaction / wallpaper 分层策略
- `取消钉住` 时不销毁这扇 panel-backed sticky，而是直接隐藏
- `再钉住` 时复用同一扇已是 `NSPanel` 的窗口再展示

### 为什么这样收口
- `NSPanel` 更适合做跨 Space、非激活、可覆盖 fullscreen 的浮层窗口。
- 真正的问题不是“置顶能力”本身，而是“取消钉住时销毁，再钉住时重建”这条生命周期链。
- 改为 panel-backed sticky 后，不再依赖普通 `NSWindow` 在 desktop layer / topmost layer / closed 之间来回切换还能恢复资格。
- `取消钉住` 改为隐藏而非销毁，也避开了 `NSPanel` 关闭释放时的 ObjC 异常风险。

### 方案意义
- 把 pinned sticky 从“普通 NSWindow 强行模拟 overlay”切换为“AppKit 原生 panel 角色”
- 让 pinned sticky 从首次创建开始就具备正确的 fullscreen overlay 语义
- 避免继续依赖旧 `NSWindow` 生命周期去承担不稳定的全屏 Space 恢复职责

## 回归关注
- `贴在底部` 状态不应出现在全屏窗口上方。
- `贴在底部` 状态应继续位于普通 app 窗口下方。
- 置顶贴纸拖动、双击进入编辑态不应受影响。
- 该变更仅影响 macOS；Windows 路径不变。
