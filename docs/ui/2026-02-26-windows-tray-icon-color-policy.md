# 2026-02-26 Windows 托盘图标彩色策略

## 判定
- 类型：`设计偏差`
- 现象：Windows 托盘图标显示为黑白模板风格，不符合 Windows 常见彩色托盘图标预期。

## 修复
- 托盘图标按平台分流：
  - macOS：继续使用 `tray-template.png` + `icon_as_template(true)`（系统模板图标）
  - 非 macOS（含 Windows）：使用 `tray-color.png` + `icon_as_template(false)`（彩色图标）
- 新增 Windows 专用托盘资源：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/tray-color.png`

## 影响文件
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`

## 回归验证
1. 在 Windows 启动应用。
2. 查看系统托盘图标应为彩色版本。
3. 在 macOS 启动应用，菜单栏图标仍保持模板风格。
