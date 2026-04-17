# Windows `PANEL_WINDOW_LABELS` 编译失败

## 现象

- Windows 构建在 `src-tauri/src/desktop/shortcuts.rs` 的导入处报错，提示 `PANEL_WINDOW_LABELS` 不存在。
- macOS 本地开发不报错，因此问题容易被平台差异掩盖。

## 根因

- `PANEL_WINDOW_LABELS` 定义在 `src-tauri/src/desktop/panel.rs`，用于主面板窗口集合遍历。
- `src-tauri/src/desktop/mod.rs` 在重导出该常量时错误加了 `#[cfg(target_os = "macos")]`。
- `desktop/shortcuts.rs` 是跨平台模块，但通过 `crate::desktop::PANEL_WINDOW_LABELS` 访问该常量。
- 结果是：
  - macOS：符号存在，编译通过。
  - Windows：符号被条件编译裁掉，导入直接失败。

## 修复

- 移除 `desktop/mod.rs` 上针对 `PANEL_WINDOW_LABELS` 的 macOS 条件编译。
- 保留 `apply_macos_runtime_dock_icon` 的 macOS 条件编译，因为它确实只服务于 macOS。

## 回归验证

- `cargo check -q --manifest-path src-tauri/Cargo.toml`

## 经验

- 纯数据常量、窗口标签表这类跨平台共享符号，不应挂平台条件编译，除非它的定义本身就依赖平台 API。
- 平台特有的是“行为函数”，不是“公共索引常量”。
