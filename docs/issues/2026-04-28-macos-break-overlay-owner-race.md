# macOS 休息全屏 overlay 循环闪退问题

## 结论

这是一次 `Bug / 回归`。

问题不在休息计时本身，而在 break overlay 的创建权被 Rust 和前端 lifecycle 同时持有：

- Rust watchdog 在检测到休息到点时，会先原生创建并拉起 overlay 窗口。
- 前端 `WorkspaceFocusHub` 要等 `focus_break_due` 事件送达后，才会把 `activeBreakKind` 置为休息态，并通过 `breakOverlayLifecycle` 发送有效 payload。

这会导致 macOS 上出现一个时序窗口：

1. overlay 窗口先启动；
2. overlay 页立即请求状态；
3. host 侧此时还没进入 `breakTimerActive`，不给有效 payload；
4. overlay 页把自己关闭；
5. host 侧随后进入休息态，又重新 ensure overlay；
6. 形成“全屏休息出现 -> 完全退出 -> 再出现”的循环。

## 根因

`break overlay` 的窗口创建职责没有收口到单一 owner。

- Rust 侧：`src-tauri/src/breaks/reminder.rs`
- 前端侧：`src/lib/workspace/break-control/break-overlay-lifecycle.js`

前者抢先创建窗口，后者才真正掌握休息态和 payload，这在 macOS 全屏覆盖场景下会放大为明显抖动。

## 修复方案

收口为单一职责模型：

- Rust watchdog 只负责：
  - 保证隐藏的 workspace runtime 存在；
  - 发出 `focus_break_due` 事件；
- 前端 `breakOverlayLifecycle` 统一负责：
  - 在 `activeBreakKind` 已经成立后创建 overlay 窗口；
  - 发送 overlay payload；
  - 关闭 overlay。

## 代码变更

- `src-tauri/src/breaks/reminder.rs`
  - 删除 macOS 到点时抢先 `ensure_break_overlay_windows_native(...)` 的行为。
- `src-tauri/src/breaks/mod.rs`
  - 删除对应导出。
- `src-tauri/src/breaks/overlay.rs`
  - 删除未再使用的原生抢先建窗辅助逻辑，保留真正还在使用的 trait / presentation 能力。

## 验证

- `cargo check -q --manifest-path src-tauri/Cargo.toml`
- `pnpm -s check`

## 回归关注点

1. macOS 休息到点时，overlay 应只出现一次，不应反复闪退重进。
2. Windows 行为不应受影响，因为这次只收口了 Rust 抢先建窗的 macOS 分支。
3. overlay 关闭后，Dock / 激活策略仍应按既有逻辑恢复。
