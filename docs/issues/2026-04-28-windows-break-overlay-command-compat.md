# Windows 编译：break overlay tauri command 的 never type fallback 兼容问题

## 结论

这是一次 `Bug / 回归`。

问题不是休息 overlay 行为本身，而是 `#[tauri::command]` 的跨平台返回路径在 Windows + Rust 2024 兼容检查下不够显式，触发了 `dependency_on_unit_never_type_fallback`。

## 根因

`src-tauri/src/breaks/overlay.rs` 中的两个命令函数：

- `apply_break_overlay_window_traits`
- `set_break_overlay_presentation`

使用了 `#[cfg(target_os = "macos")]` / `#[cfg(not(target_os = "macos"))]` 分支，并在非 mac 分支末尾写成了隐式 `Ok(())` 表达式。Tauri 宏展开后，Windows 下会落到 Rust 2024 的 `never type fallback` 兼容告警，并被当前工程的兼容 deny 提升为编译错误。

同时，这轮还暴露出两条和本次修复无关但会污染 Windows 构建输出的警告：

- `src-tauri/src/desktop/panel.rs` 的 `any_visible_panel`
- `src-tauri/src/desktop/sticky/mod.rs` 的 `app`

## 修复方案

1. 把非 mac 分支改成显式 `return Ok(());`
2. 修正 `breaks::mod.rs` / `lib.rs` 的跨平台导出与导入边界，避免 command 在 Windows 下被错误裁掉
3. 收掉平台条件下的无意义变量警告，避免 Windows 构建输出继续被噪音污染
4. 将仅在 macOS 使用的 break overlay presentation state 改为按平台裁剪，避免 Windows 侧 dead code 警告

## 代码变更

- `src-tauri/src/breaks/overlay.rs`
  - 非 mac 分支显式 `return Ok(());`
- `src-tauri/src/breaks/mod.rs`
  - command 导出不再被错误地包在 `#[cfg(target_os = "macos")]` 里
- `src-tauri/src/lib.rs`
  - `process_break_reminder_due` 仅在 mac 下导入，其余 command 保持全平台导入
- `src-tauri/src/desktop/panel.rs`
  - `any_visible_panel` 仅在 mac 下声明与写入
- `src-tauri/src/desktop/sticky/mod.rs`
  - 在函数开头显式消费 `app` 引用，避免 Windows 侧未使用警告
- `src-tauri/src/runtime/state.rs`
  - `BreakOverlayPresentationState` 按平台裁剪：mac 保留真实状态，非 mac 使用空壳类型
- `src-tauri/src/desktop/sticky/effects.rs`
  - `EffectState` 仅在 macOS 下导入，避免 Windows 无用导入警告

## 验证

- mac 本地：
  - `cargo check -q --manifest-path src-tauri/Cargo.toml`
  - `pnpm -s check`
- Windows 远程：
  - `ssh 19519@192.168.0.105 "cd /f/language/rust/code/desk_tidy_sticky && cargo check -q --manifest-path src-tauri/Cargo.toml"`

## 回归关注点

1. 这次只修编译兼容与警告，不改变休息 overlay 的运行时行为。
2. 后续再改 `#[tauri::command]` 的跨平台分支时，优先保持显式返回，避免再次踩 Rust 2024 兼容规则。
