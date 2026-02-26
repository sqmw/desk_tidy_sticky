# 2026-02-26 Windows 任务栏图标视觉尺寸偏小调整

## 判定
- 类型：`资源视觉问题`
- 现象：Windows 任务栏中应用图标相较常见应用视觉上偏小。

## 处理方式
- 基于现有图标做居中放大（第二版约 `1.21x`，512 -> 620 后中心裁回 512），避免改动品牌元素形状。
- 使用放大后的源图重新生成图标集。
- 仅回写 Windows 相关输出资源（`icon.ico`、Windows SquareLogo、StoreLogo 及配套 PNG）。
- macOS 专用图标（`dock-icon.png` / `tray-template.png`）未改动。

## 影响文件
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/icon.ico`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/icon.png`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/32x32.png`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/64x64.png`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/128x128.png`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/128x128@2x.png`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/Square30x30Logo.png`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/Square44x44Logo.png`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/Square71x71Logo.png`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/Square89x89Logo.png`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/Square107x107Logo.png`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/Square142x142Logo.png`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/Square150x150Logo.png`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/Square284x284Logo.png`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/Square310x310Logo.png`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/StoreLogo.png`

## 验证建议
1. Windows 清理旧任务栏固定项后重新启动应用。
2. 对比 Edge/微信等图标视觉占比，确认不再偏小。
