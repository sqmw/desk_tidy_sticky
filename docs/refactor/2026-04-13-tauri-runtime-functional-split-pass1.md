# Tauri Runtime 功能域拆分 Pass1

日期：2026-04-13  
范围：`src-tauri/src/lib.rs` 后端运行时入口瘦身

## 背景
- `src-tauri/src/lib.rs` 已承载过多职责：
  - Tauri builder / plugin / invoke handler 组装
  - 全局运行时状态
  - panel 窗口显隐、最小化、Dock/taskbar 壳状态
  - macOS break overlay 跨屏创建与 presentation 生命周期
  - break reminder watchdog 到点判定
  - 贴纸窗口层级与笔记命令
- 最近 macOS 休息提醒与窗口生命周期连续出现回归，继续把相关逻辑堆在入口文件里，会增加定位和回归成本。

## 本次决策
- 按功能域拆分 Rust 后端，不按泛化 `utils` / `commands` 大杂烩拆分。
- 本轮只做“搬家 + 命名边界收敛”，不主动改变运行行为。
- 先拆与近期严重 bug 关系最密切的窗口生命周期和休息提醒链路，贴纸窗口层级、笔记命令、托盘菜单后续再拆。

## 模块边界

### `src-tauri/src/app_state.rs`
- 承载跨模块共享的运行时状态：
  - `OverlayInputState`
  - `BreakReminderWatchState`
  - `BreakReminderWatchSnapshot`
  - `BreakOverlayPresentationState`
- 约束：
  - 只存状态与状态原子操作；
  - 不直接依赖窗口创建、overlay 创建或托盘菜单。

### `src-tauri/src/panel_windows.rs`
- 承载 `main/workspace` panel 窗口生命周期：
  - `show_preferred_panel_window`
  - `ensure_workspace_panel_window`
  - `ensure_hidden_workspace_runtime_window`
  - `sync_panel_window_shell_state`
  - `hide_panel_window`
  - `minimize_panel_window`
  - macOS Dock icon runtime 应用
- 约束：
  - 只处理 panel 窗口与 Dock/taskbar 壳状态；
  - 不直接处理 break overlay 的倒计时和 payload。

### `src-tauri/src/break_overlay.rs`
- 承载休息 overlay 原生窗口生命周期：
  - `ensure_break_overlay_windows_native`
  - `apply_break_overlay_window_traits`
  - `set_break_overlay_presentation`
  - overlay label 与 monitor bounds 计算
- 约束：
  - 只处理 overlay 窗口创建、原生 traits、presentation 恢复；
  - 不负责“什么时候该休息”的时间判定。

### `src-tauri/src/break_reminder.rs`
- 承载休息提醒 watchdog：
  - `sync_break_reminder_watchdog`
  - `process_break_reminder_due`
  - `start_break_reminder_watchdog`
- 约束：
  - 只处理墙钟到点判定、去重、事件发出；
  - macOS 到点时可以调用 `break_overlay::ensure_break_overlay_windows_native`，但不直接维护 overlay UI payload。

### `src-tauri/src/lib.rs`
- 继续保留：
  - Tauri builder / plugin / invoke handler 组装
  - 当前尚未拆出的笔记命令、贴纸窗口层级、托盘菜单
  - 平台 window handle helper
- 目标：
  - 后续继续把托盘菜单拆到 `tray.rs`
  - 把贴纸窗口层级拆到 `sticky_windows.rs`
  - 最终让 `lib.rs` 更接近应用启动入口，而不是业务实现集合。

## 当前收益
- `src-tauri/src/lib.rs` 从约 1449 行降到约 945 行。
- macOS 休息提醒相关链路现在集中在：
  - `app_state.rs`
  - `break_reminder.rs`
  - `break_overlay.rs`
  - `panel_windows.rs`
- 后续排查“到点不提醒 / Dock 点击才触发 / overlay 生命周期 / 最小化壳状态”时，不再需要在入口文件里混查笔记和贴纸命令。

## 后续建议
1. Pass2：拆 `tray.rs`
   - `TrayMenuState`
   - `update_tray_texts`
   - tray menu 创建与菜单事件分发
2. Pass3：拆 `sticky_windows.rs`
   - `apply_overlay_input_state`
   - `apply_note_window_layer_with_interaction_by_label`
   - `pin_window_to_desktop`
   - `unpin_window_from_desktop`
   - `apply_window_no_snap_by_label`
   - z-order / wallpaper-layer 相关命令
3. Pass4：前端拆 `WorkspaceFocusHub.svelte`
   - break controller
   - break overlay controller
   - task session controller
   - notification controller

## 验证
- 本轮要求至少执行：
  - `cargo check` in `src-tauri`
  - `pnpm check` in repo root
- 预期行为：
  - 编译通过；
  - 休息提醒与 panel 最小化行为不因搬家改变。
