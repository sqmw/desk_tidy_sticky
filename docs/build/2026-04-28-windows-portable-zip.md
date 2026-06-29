# Windows 便携版 zip 打包

## 背景

当前项目已经能稳定产出 Windows 安装包：

- `msi`
- `nsis setup.exe`

但如果希望用户“下载后直接解压运行”，更适合额外提供一个 portable zip，而不是只提供安装器。

## 当前结论

本项目的 Windows 便携版不需要走 Tauri bundle targets 扩展。

原因：

1. `pnpm tauri build --no-bundle` 已经会生成可直接运行的：
   - `src-tauri/target/release/desk_tidy_sticky.exe`
2. 当前 release 目录下没有额外必须一起分发的运行时 DLL 依赖。
3. 因此 portable zip 只需要围绕 release exe 做二次打包即可。

## 脚本

已新增 Windows 打包脚本：

- `scripts/windows/build-portable-zip.ps1`

默认行为：

1. 执行：

```powershell
pnpm tauri build --no-bundle
```

2. 组装便携目录：
   - `desk_tidy_sticky.exe`
   - `README.md`
   - `README.en.md`
   - `README-Portable.txt`
3. 生成 zip：

```text
src-tauri/target/release/bundle/portable/Desk Tidy Sticky_<version>_x64_portable.zip
```

如果确认为本轮临时运行产物占用了 exe，可以显式追加 `-StopRunning`，脚本会先停掉正在运行的 `desk_tidy_sticky.exe`。

## 用法

在 Windows 项目根目录执行：

```powershell
make package-portable
```

如果已经提前完成 release 构建，也可以跳过构建步骤：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/build-portable-zip.ps1 -SkipBuild
```

如果需要先结束正在运行的程序再打包：

```powershell
make package-portable-stop
```

## 便携版说明

portable zip 的目标是“解压即用”，但仍有两个边界：

1. 不会自动创建开始菜单或桌面快捷方式。
2. 仍依赖系统已安装的 Microsoft Edge WebView2 Runtime。

另外，便携版只是分发形态变了，用户数据目录仍然走系统应用数据目录，不会默认和 exe 放在同一目录。

## 验证

1. 在 Windows 上执行脚本。
2. 确认生成：
   - `src-tauri/target/release/bundle/portable/Desk Tidy Sticky_<version>_x64_portable.zip`
3. 解压 zip。
4. 直接运行 `desk_tidy_sticky.exe`。
5. 确认主窗口能打开，便笺/工作台基础功能正常。
