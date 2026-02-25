# macOS 透明窗口告警 + Dock 图标异常 + 贴纸无反应联动修复（2026-02-25）

## 判定
- 类型：`Bug/回归`

## 现象
- `pnpm tauri dev` 持续打印：
  - `The window is set to be transparent but the macos-private-api is not enabled.`
- Dock 图标显示成系统 `exec`/默认图标，而不是产品图标。
- 点击“桌面贴纸”后体感“无反应”（存在窗口已创建但未恢复可见的场景）。

## 根因
1. macOS 私有 API 未在 Tauri 配置层启用
- 主窗口/贴纸窗口均为透明窗口，未开启 `macOSPrivateApi` 会触发运行时告警并影响透明能力稳定性。

2. Dock 图标仅在启动时设置一次
- 当主窗口全部隐藏后切到 `Accessory`，再恢复到 `Regular` 时，Dock 可能回退为默认图标。
- 缺少在激活策略恢复时的“再次设置应用图标”步骤。

3. 贴纸窗口同步仅覆盖“新建窗口”
- `syncWindows()` 只在不存在窗口时创建；若窗口对象还在但处于不可见/最小化状态，不会被恢复显示。
- 用户点击“桌面贴纸”时，出现“按钮切换了但没看到贴纸”的体感。

## 修复方案
1. 启用 macOS 私有 API
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/tauri.conf.json`
  - 在 `app` 下增加：`"macOSPrivateApi": true`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/Cargo.toml`
  - `tauri` 依赖特性补充：`macos-private-api`

2. 强化 Dock 图标重设时机
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
  - 新增 `apply_macos_runtime_dock_icon(app)`。
  - 启动阶段调用一次。
  - `sync_panel_window_shell_state()` 中当面板窗口可见（切回 `Regular`）时再次调用，避免图标回退。

3. 贴纸窗口恢复可见性
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/panel/use-window-sync.js`
  - `syncWindows()` 新增“已存在窗口恢复”逻辑：
    - 检测 `isVisible()` 与 `isMinimized()`
    - 必要时执行 `unminimize()` + `show()`
  - 层级重试同步触发条件扩展为：
    - 新建窗口 `createdWindowCount > 0`
    - 或恢复窗口 `restoredWindowCount > 0`

4. macOS 贴纸交互状态与原生窗口行为一致化
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/macos_windows.rs`
  - 交互态：`DesktopIcon + 1` + `setIgnoresMouseEvents(false)` + `makeKeyAndOrderFront`
  - 非交互态：`Desktop` + `setIgnoresMouseEvents(true)` + `orderFront`
  - 从桌面层分离时显式 `setIgnoresMouseEvents(false)`，避免残留穿透状态。

## 回归验证
1. 执行 `pnpm tauri dev`，确认不再重复出现 `macos-private-api` 告警。
2. 关闭主窗口（隐藏）后再从托盘或 Dock 恢复，确认 Dock 图标仍为产品图标。
3. 在有已 Pin 贴纸的前提下，反复切换“桌面贴纸”开关，确认贴纸可见性稳定（不会“点了没反应”）。
4. 切换“贴纸鼠标交互：开/关”，确认可交互与穿透模式切换正常。
