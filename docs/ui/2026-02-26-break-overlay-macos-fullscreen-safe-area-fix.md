# 2026-02-26 休息提示层（macOS）全屏与底部遮挡修复

## 判定
- 类型：`Bug`
- 现象：休息提示层显示时仍可见菜单栏与 Dock，底部按钮/文案存在被 Dock 遮挡风险。

## 修复
1. 窗口运行态改为优先 `setSimpleFullscreen(true)`（macOS），失败回退 `setFullscreen(true)`。
2. 复用窗口时先退出 fullscreen，再更新几何，避免 setPosition/setSize 在全屏态失效。
3. `break-overlay` 页面改用 `100dvh/100dvw`，并加入 `safe-area` 顶部/底部内边距，防止底部内容裁切。

## 影响文件
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-break-overlay-windows.js`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/break-overlay/+page.svelte`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/capabilities/default.json`

## 回归步骤
1. 开启休息提醒并触发休息提示。
2. 在 macOS 下确认提示层覆盖后，Dock 不再遮挡底部内容。
3. 多次触发休息提示，确认窗口可重复进入提示态，不出现位置/尺寸错乱。

## 2026-03-26 补充：休息倒计时进度条语义与样式

- 判定：这是设计问题，不是倒计时逻辑 Bug。
- 根因：`break-overlay` 的进度值本身已经是从 `0 -> 100` 递增，但“占位层/已覆盖层”的颜色关系做反了，用户预期是“白色空白占位，绿色逐渐覆盖”，当前实现却是白色作为增长层。
- 调整：保留现有进度计算逻辑，只收敛样式为“白色占位轨道 + 绿色填充逐渐覆盖”，不改事件、不改时间计算。
- 代码：`src/routes/break-overlay/+page.svelte`
- 回归：启动休息 overlay 后，进度条应从白色空轨道开始，随后绿色填充随时间逐步增长；`剩余 mm:ss` 文案保持不变。

## 2026-03-27 补充：macOS 全屏 App 压制失败与 Dock 泄露修复

### 判定
- 类型：`Bug/回归`
- 现象：
  1. 其他 macOS App 已处于系统全屏时，休息 overlay 无法稳定盖在最上层。
  2. 部分触发路径中底部 Dock 仍会露出，破坏“强制休息提示”。

### 根因
1. 原实现主要依赖前端 `WebviewWindow.setSimpleFullscreen(true)` / `setFullscreen(true)`。
2. 这条链只能得到“窗口自己的全屏状态”，不能保证窗口进入：
   - 正确的 active Space
   - `FullScreenAuxiliary`
   - 更高的 macOS 原生 window level
3. 因此 overlay 在遇到别的全屏 App Space 时，会落在错误的 Space 或错误层级。
4. Dock 显示问题也来自同一根因：窗口只是“前端意义上的全屏”，没有同步切换 macOS app presentation options。
5. AppKit 约束：`CanJoinAllSpaces` 与 `MoveToActiveSpace` 不能同时设置；两者并存会直接触发 `NSInternalInconsistencyException`。

### 修复
1. 新增 macOS 原生命令：
   - `apply_break_overlay_window_traits`
   - `set_break_overlay_presentation`
2. 休息 overlay 激活时，原生窗口改为：
   - `MoveToActiveSpace`
   - `FullScreenAuxiliary`
   - `Stationary`
   - `IgnoresCycle`
   - `ScreenSaverWindowLevel`
3. 休息 overlay 激活时同步切换 macOS app presentation：
   - `HideDock`
   - `HideMenuBar`
   - `activateIgnoringOtherApps(true)`
   - 临时切回 `ActivationPolicy::Regular`
4. 旧的前端 fullscreen 进入逻辑退役：
   - 只保留几何铺满屏幕
   - 不再把 `simple fullscreen` 当作系统级遮罩方案
5. collection behavior 组合修正为：
   - 保留 `MoveToActiveSpace`
   - 去掉 `CanJoinAllSpaces`
   - 避免 macOS 因行为冲突直接崩溃

### 影响文件
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/macos_windows.rs`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-break-overlay-windows.js`

### 回归步骤
1. 在 macOS 上打开任意一个系统全屏 App。
2. 触发休息提醒 overlay。
3. 确认 overlay 仍能直接压到最上层。
4. 确认显示期间 Dock / 菜单栏不会露出。

## 2026-03-27 补充：全屏 App 存在时“到点没反应”的根因收敛

### 判定
- 类型：`Bug/回归`
- 现象：即使 overlay 原生层级已提高，只要当前正在使用另一个 macOS 全屏 App，独立休息提醒到点时仍可能完全没有反应。

### 根因
1. 旧实现里“独立休息提醒到点”仍主要依赖 `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte` 内的前端 `setInterval`。
2. 当应用处于后台、尤其当前焦点在另一个全屏 App 时，隐藏 `webview` 的 JS 定时器存在被系统节流的风险。
3. 结果不是“overlay 压不过去”，而是“前端根本没有及时判定到点”，后续 overlay 创建链路自然不会启动。
4. 同时，`workspace` 窗口并不是默认常驻；如果提醒依赖它内部的事件监听器，启动条件本身也不稳定。

### 修复
1. Rust 侧新增 `BreakReminderWatchState` 与常驻 watchdog 线程：
   - 前端不再独占“到点判定”
   - 前端只负责同步绝对到点时间
   - Rust 负责基于真实墙钟时间触发 `focus_break_due`
2. 前端新增 `sync_break_reminder_watchdog` 调用：
   - 同步 `enabled`
   - 同步 `activeBreakKind`
   - 同步 `miniDueAtMs / longDueAtMs`
3. `WorkspaceFocusHub.svelte` 新增对 `focus_break_due` 的监听：
   - 收到 Rust 原生事件后执行既有 `notifyBreak("start") + applyBreakNow(kind)` 流程
4. 启动阶段默认创建隐藏的 `workspace` 常驻窗口：
   - 不抢占 Dock/Taskbar
   - 但保证工作台上的休息提醒监听器始终存在
5. 前端原有 `setInterval` 仍保留为前台兜底：
   - 但不再是唯一触发源

### 影响文件
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`

### 回归步骤
1. 启动应用但不必手动打开工作台，让 `workspace` 以隐藏窗口形式常驻。
2. 打开任意其他 macOS 全屏 App。
3. 等独立休息提醒到点。
4. 预期：
   - 即使当前焦点在其他全屏 App，仍会触发休息 overlay。
   - 不是等切回本应用、点一下 DevTools、或重新回到工作台后才触发。
