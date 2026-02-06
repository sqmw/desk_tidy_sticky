# Windows 打包失败：NSIS 下载 `io: unexpected end of file`（2026-02-06）

## 现象

执行 `pnpm tauri build` 时，MSI 已经构建完成，但在继续生成 NSIS 安装包阶段失败：

- `Downloading ... nsis-3.11.zip`
- `failed to bundle project io: unexpected end of file`

这是典型的网络/缓存下载中断导致的压缩包不完整（EOF）。

## 本项目的处理策略（推荐）

当前项目默认只产出 **MSI**（WiX），跳过 NSIS：

- 配置文件：`src-tauri/tauri.conf.json`
- 设置：`bundle.targets = ["msi"]`

优点：
- 规避 NSIS 下载不稳定导致的构建失败
- 对 Windows 发布而言 MSI 通常足够

## 另一个常见失败：Access denied 无法删除 exe

如果出现：

- `failed to remove file ... target\\release\\desk_tidy_sticky.exe`
- `拒绝访问 (os error 5)`

通常是因为正在运行 `desk_tidy_sticky.exe`（或被系统/杀毒占用）。

解决：

1. 先退出应用（托盘 -> Exit）
2. 或手动结束进程后再构建：

```powershell
Get-Process desk_tidy_sticky -ErrorAction SilentlyContinue | Stop-Process -Force
pnpm tauri build
```

