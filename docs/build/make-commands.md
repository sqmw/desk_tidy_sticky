# Make 命令入口

## 背景

本项目是 Tauri 2 + SvelteKit 桌面应用，日常开发同时覆盖 macOS 和 Windows。
为降低跨端启动、检查、构建和打包命令的记忆成本，项目根目录提供统一 `Makefile`。

## 当前命令

| 命令 | macOS | Windows | 说明 |
|---|---|---|---|
| `make install` | 支持 | 支持 | 执行 `pnpm install` |
| `make dev` / `make start` | 支持 | 支持 | 执行 `pnpm tauri dev`，启动桌面开发模式 |
| `make frontend-dev` | 支持 | 支持 | 执行 `pnpm dev`，只启动前端服务 |
| `make check` | 支持 | 支持 | 先执行 `pnpm check`，再执行 `cargo check --manifest-path src-tauri/Cargo.toml` |
| `make check-frontend` | 支持 | 支持 | 只执行前端检查 |
| `make check-rust` | 支持 | 支持 | 只执行 Rust 检查 |
| `make test` | 支持 | 支持 | 依次执行前端交互测试和 Rust 单元测试 |
| `make test-frontend` | 支持 | 支持 | 只执行前端交互测试 |
| `make test-rust` | 支持 | 支持 | 只执行 Rust 单元测试 |
| `make build` | 支持 | 支持 | 执行 `pnpm tauri build --no-bundle`，生成 release 可执行文件 |
| `make build-frontend` | 支持 | 支持 | 执行 `pnpm build`，只构建前端产物 |
| `make package` | 支持 | 支持 | 执行 `pnpm tauri build`，生成当前平台 bundle |
| `make package-portable` | 不支持 | 支持 | 生成 Windows portable zip，不主动结束正在运行的程序 |
| `make package-portable-stop` | 不支持 | 支持 | 生成 Windows portable zip，并先结束 `desk_tidy_sticky.exe` |
| `make clean` | 支持 | 支持 | 删除本地构建产物 |

## 脚本边界

- `Makefile` 只保留统一入口和平台路由。
- macOS / POSIX 逻辑在 `scripts/make/task.sh`。
- Windows 逻辑在 `scripts/make/task.ps1`。
- Windows portable zip 的实际组装继续由 `scripts/windows/build-portable-zip.ps1` 负责。

## 工具版本

- Node 依赖管理器固定为 `pnpm@10.28.2`，声明在 `package.json` 的 `packageManager` 字段。
- `pnpm-workspace.yaml` 通过 `allowBuilds.esbuild: true` 允许 `esbuild` 执行安装期 build script，用于避免非交互终端或 CI 中被 pnpm 的 build 审批阻塞。

## Windows 使用约定

在 Windows 的项目根目录执行：

```powershell
make dev
make check
make test
make package
make package-portable
```

如果构建时确认为本轮临时运行产物占用了 exe，再使用：

```powershell
make package-portable-stop
```

该目标会调用 `scripts/windows/build-portable-zip.ps1 -StopRunning`，会结束正在运行的 `desk_tidy_sticky.exe`。

## 验证建议

最低验证：

```bash
make help
make check
make test
```

打包验证：

- macOS：执行 `make package` 后检查 `src-tauri/target/release/bundle/`。
- Windows：执行 `make package` 或 `make package-portable` 后检查 `src-tauri\target\release\bundle\`。
