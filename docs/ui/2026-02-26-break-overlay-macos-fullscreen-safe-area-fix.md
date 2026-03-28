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

## 2026-03-28 补充：已有全屏 App 时偶发需要手动切 Space 才出现

### 判定
- 类型：`Bug/回归`
- 现象：当系统里已经存在一个其他全屏 App 时，休息 overlay 偶发不会立即压上来；手动三指左右切一下 Space 后，overlay 才出现。

### 根因
1. overlay 创建链路里，窗口是先创建/展示，再调用 `set_break_overlay_presentation(active: true)`。
2. 对 `MoveToActiveSpace + FullScreenAuxiliary` 这类原生窗口来说，这个顺序不够稳：
   - 窗口可能先在错误的 Space 完成创建
   - 后续再切 presentation 时，系统不会总是立刻把它带进当前全屏 Space
3. 所以问题表现为“不是完全失败，而是偶发需要用户手动切一次 Space 才刷新出来”。

### 修复
- 文件：
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-break-overlay-windows.js`
- 激活时序改为：
  1. 先 `set_break_overlay_presentation(active: true)`
  2. 再创建 / 复用并展示各个 overlay 窗口
  3. 创建完成后再补一次 `set_break_overlay_presentation(active: true)` 做兜底

### 结果
1. overlay 在已有其他全屏 App 的前提下，更容易一次性进入当前活跃 Space。
2. 降低“必须三指切一下 Space 才出现”的偶发概率。

## 2026-03-28 补充：休息 overlay 结束后不再改写主窗口行为

### 判定
- 类型：`Bug/回归`
- 现象：休息 overlay 结束后，原本已经打开的 `workspace` 或 `main` 面板窗口，偶发会被收成“仅剩菜单栏图标”的状态。
- 期望：休息提醒只能管理 overlay 自己的展示与关闭，不能顺手改动主窗口的打开/显示策略。

### 根因
1. `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
   中 `set_break_overlay_presentation(active: false)` 在 overlay 结束后会直接调用 `sync_panel_window_shell_state(&app)`。
2. 这意味着休息 overlay 结束时，会重新推导整个 app 的 panel shell state：
   - `skip_taskbar`
   - `ActivationPolicy`
   - Dock 图标显隐
3. 这种“结束 overlay 时顺手同步主窗口状态”的做法越过了 overlay 的职责边界，因此会把不该被动到的窗口状态也一起改掉。

### 修复
1. 新增 `BreakOverlayPresentationState`：
   - 在 overlay 激活前先记录“进入休息前是否需要 `Regular` activation policy”。
2. overlay 结束时改为恢复进入休息前的 app presentation 状态：
   - 若休息前有可见 panel，则恢复 `Regular`
   - 若休息前没有可见 panel，则恢复 `Accessory`
3. 不再在 overlay 结束时直接调用 `sync_panel_window_shell_state(&app)` 去重算主窗口行为。

### 结果
1. 休息 overlay 只负责自己的 presentation 生命周期。
2. `workspace/main` 的显示策略不再被 overlay 结束路径误改。
3. 用户原本打开着哪个窗口、Dock 是否应保留，不再被休息提醒链路“顺手收掉”。

## 2026-03-28 补充：watchdog 不再隐藏已打开的 workspace

### 判定
- 类型：`Bug/回归`
- 现象：即使已经打开了 `workspace`，一到休息时间它也会被直接藏起来；overlay 结束后看起来就只剩菜单栏图标。

### 根因
1. Rust watchdog 在发出 `focus_break_due` 前会调用：
   - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
   - `ensure_hidden_workspace_runtime_window(&app_handle)`
2. 旧实现里，这个函数无论当前 `workspace` 是否正在显示，都会直接：
   - `window.hide()`
   - `window.set_skip_taskbar(true)`
3. 因此只要提醒触发，已经打开的工作台会被错误地隐藏。

### 修复
1. `ensure_hidden_workspace_runtime_window()` 改为：
   - 如果 `workspace` 已存在且当前可见：直接返回，不做任何隐藏操作；
   - 只有在 `workspace` 不存在时，才创建一个隐藏 runtime 窗口；
   - 如果 `workspace` 已存在但本来就是隐藏状态，仅保持 `skip_taskbar=true`。

### 结果
1. watchdog 仍能保证后台 runtime 存在。
2. 但不会再误伤用户当前已经打开的 `workspace` 面板。
3. 休息提醒结束后，原本打开的窗口状态保持不变。

## 2026-03-28 补充：overlay 结束链路不再二次改写 panel shell state

### 判定
- 类型：`Bug/回归`
- 现象：即使已经修正 watchdog 不再隐藏可见 `workspace`，休息 overlay 结束后仍偶发出现“所有窗口消失，只剩菜单栏”的问题。

### 根因
1. overlay 关闭链路里，`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
   的 `closeBreakOverlayEverywhere()` 之前会连续执行：
   - `closeBreakOverlayWindowsByLabels(labels)`
   - `closeBreakOverlayWindows()`
2. 这意味着前端会连续两次调用：
   - `set_break_overlay_presentation(active: false)`
3. Rust 侧 `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
   中 `set_break_overlay_presentation(false)` 第一次会正确消费 `BreakOverlayPresentationState` 快照；
   第二次因为快照已被消费，会落入旧的 `sync_panel_window_shell_state(&app)` 兜底。
4. 这条兜底本质上又把 overlay 生命周期重新耦合回 panel 生命周期，属于越权恢复；在 macOS 全屏 / Space / activation policy 的时序下，会把主窗口壳状态再次推偏，最终表现为“窗口都没了，只剩菜单栏”。

### 修复
1. 前端 overlay 关闭链路收敛为一次性 teardown：
   - 仍先给已知 overlay labels 发 `{ close: true }`，让页面自关闭；
   - 真正的窗口清理只保留一次 `closeBreakOverlayWindows()`
2. Rust 侧 `set_break_overlay_presentation(false)` 在“没有可恢复快照”时改为 `no-op`：
   - 不再回退执行 `sync_panel_window_shell_state(&app)`
   - overlay presentation 生命周期只恢复自己捕获的状态，不再推断 panel 可见性

### 影响文件
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`

### 结果
1. overlay 结束时只做一次 presentation 恢复。
2. 即使关闭链路重复触发，也不会再因为“无快照兜底”改写 `workspace/main` 的窗口壳状态。
3. 休息结束后，主窗口是否显示完全由用户原始状态决定，不再被 overlay 生命周期影响。

## 2026-03-28 补充：到点强制休息改为 Rust 原生预建 overlay 窗口

### 判定
- 类型：`Bug/回归`
- 现象：当用户正在其他 macOS 全屏 App 内工作时，休息提醒到点后不会立刻强占当前屏幕；通常需要三指切回应用所在 Space，overlay 才出现。

### 根因
1. 旧链路里，Rust watchdog 到点后只负责发出 `focus_break_due` 事件。
2. 真正“创建/展示 break overlay 窗口”的动作仍依赖：
   - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
   - 隐藏 `workspace` 页里的 JS 监听器
3. 在 macOS 场景下，如果当前焦点在别的全屏 App，隐藏 WebView 的 JS 事件链可能被后台节流。
4. 结果不是“overlay 压不过去”，而是“overlay 窗口本身还没来得及创建”；等用户三指切回应用 Space 后，积压的事件才被处理，所以看起来像是“切回来才触发”。

### 修复
1. 在 Rust watchdog 命中到点时，macOS 先原生执行：
   - `set_break_overlay_presentation(active: true)`
   - 按监视器列表直接创建 / 复用 `focus-break-overlay-*` 窗口
   - 立即应用 `apply_break_overlay_window_traits`
2. 前端 `WorkspaceFocusHub.svelte` 继续保留：
   - payload 同步
   - 倒计时渲染
   - 推迟 / 跳过动作
3. 这样职责被重新切开：
   - Rust 负责“到点必须把 overlay 窗口顶上来”
   - 前端负责“overlay 里展示什么、按钮怎么交互”

### 影响文件
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`

### 结果
1. break overlay 的出现不再依赖隐藏 `workspace` WebView 的前台调度时机。
2. 即使当前焦点在其他全屏 App，到点后也会先把 overlay 原生建出来并压到当前 Space。
3. 前端如果稍后才补到 payload，影响的只是文案同步时机，不再影响“强制占用屏幕提醒”本身。

## 2026-03-28 补充：全屏 App 仍需手动切 Space 的原生根因修正

### 判定
- 类型：`Bug/回归`
- 现象：即使 Rust 已在到点时原生预建 break overlay，当前如果正停留在其他 macOS 全屏 App，overlay 仍可能不直接占住当前屏幕；用户需要三指切回应用 Space 才看到提醒。

### 根因
1. 之前 break overlay 的 `collectionBehavior` 仍是：
   - `MoveToActiveSpace`
   - `FullScreenAuxiliary`
2. 这更像“跟随当前激活切 Space”，而不是“让 overlay 直接加入所有 Space”；对于“别的 app 已经在全屏 Space 内”的场景并不稳。
3. 同时，overlay 新窗口默认是先创建为可见窗口，再补：
   - 原生 `collectionBehavior`
   - 原生 `window level`
   - `make key / order front`
4. 对需要跨 Space 抢占的窗口来说，这个时序太晚了：窗口第一次出现时已经可能落在错误的 Space，后续再补 traits 不一定会被系统立刻带进当前全屏 Space。

### 修复
1. break overlay 原生 collection behavior 改为：
   - `CanJoinAllSpaces`
   - `FullScreenAuxiliary`
   - `Stationary`
   - `IgnoresCycle`
2. overlay 新窗口改为：
   - 先 `visible(false)` 创建
   - 先应用原生 break overlay traits
   - 再 `show + unminimize + focus`
3. 原生窗口 fronting 再加强一层：
   - `makeKeyAndOrderFront(None)`
   - `orderFrontRegardless()`
   - `NSRunningApplication::currentApplication().activateWithOptions(ActivateAllWindows)`

### 影响文件
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/macos_windows.rs`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-break-overlay-windows.js`

### 结果
1. break overlay 的“第一次可见”就发生在正确的原生窗口 traits 已就位之后。
2. 进入其他 app 全屏 Space 的能力不再依赖 `MoveToActiveSpace` 的激活时机，而是改用更符合 overlay 语义的 `CanJoinAllSpaces + FullScreenAuxiliary`。
3. 降低“必须手动三指切回应用 Space 才出现”的概率。
