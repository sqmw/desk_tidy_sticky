# Windows dev 启动：macOS git 依赖解析失败

## Situation

2026-06-29，Windows 侧执行：

```powershell
make dev
```

或等价命令：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/make/task.ps1 dev
```

Tauri dev 已经正确启动 Vite，但 Cargo 在解析 Rust 依赖时失败：

```text
failed to get `tauri-nspanel`
revision 18ffb9a201fbf6fedfaa382fd4b92315ea30ab1a not found
failed to start SSH session: Failed getting banner
```

## Task

本轮目标是修复 Windows `make dev` 被 macOS 专用依赖阻塞的问题。

判断标准：

- Windows 不应在启动开发模式时依赖实时拉取 GitHub branch 上的 macOS-only crate。
- macOS 的 nspanel 能力仍保留。
- 命令入口仍通过 `make dev` / `scripts/make/task.ps1 dev` 使用。

## Action

根因：

- `tauri-nspanel` 已经位于 `target_os = "macos"` 条件依赖下，代码调用也已用 `#[cfg(target_os = "macos")]` 隔离。
- 但 `Cargo.lock` 中记录的是 GitHub branch source：
  `git+https://github.com/ahkohd/tauri-nspanel?branch=v2#18ffb9a...`
- Windows 首次解析或刷新锁文件时仍会尝试更新该 git source；如果 GitHub、SSH banner、代理或远端 branch 状态异常，就会在真正编译 Windows 代码前失败。

修复：

- 将当前已验证可用的 `tauri-nspanel 2.0.1` 最小源码 vendor 到：
  `src-tauri/vendor/tauri-nspanel`
- `src-tauri/Cargo.toml` 将 macOS target dependency 改为：

```toml
tauri-nspanel = { path = "vendor/tauri-nspanel" }
```

## Result

预期效果：

- Windows 侧 Cargo 解析不再需要访问 `https://github.com/ahkohd/tauri-nspanel`。
- macOS 侧仍使用同一版本的 nspanel 源码。

2026-06-29 追加修复：

- Windows 实跑继续暴露 `src/desktop/sticky/panel_window.rs` 非 macOS 分支缺少 `tauri::Manager` trait 导入，导致 `get_webview_window` 不可见。
- 已将 `use tauri::Manager` 从 macOS-only 导入改为全平台导入。
- 同轮消除 `src/desktop/sticky/mod.rs` 中 Windows 分支未使用 `app` 参数的 warning。

验证命令：

```bash
cargo metadata --manifest-path src-tauri/Cargo.toml --filter-platform x86_64-pc-windows-msvc --format-version 1 --locked --offline
make check
make build
```

macOS 本机曾尝试执行：

```bash
cargo check --manifest-path src-tauri/Cargo.toml --target x86_64-pc-windows-msvc --no-default-features --locked --offline
```

但当前 macOS toolchain 虽列出 `x86_64-pc-windows-msvc`，实际缺少该 target 的 `std`，因此该命令未作为本轮验收依据。

Windows 回归建议：

```powershell
make dev
```

如果仍失败，下一优先级再看 Windows 本机 Cargo registry、Rust toolchain、代理和 WebView2/Tauri 环境，而不是继续排查 Makefile。
