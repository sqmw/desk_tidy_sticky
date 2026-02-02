# GitHub Star 入口位置优化 + Tray 增加入口

## 目标
- “在 GitHub 上点星”入口更显眼：不要放在设置弹窗最底部。
- tray 菜单也提供同样入口，减少用户找入口成本。

## 改动
### Settings Dialog
- 将 “在 GitHub 上点星” 按钮从快捷键区域底部移动到设置弹窗顶部（应用名/版本行下方）。
- 这样用户打开设置即可第一眼看到。

代码：`lib/pages/panel/settings_dialog.dart`

### Tray Menu
- tray 右键菜单新增 `strings.starOnGithub`。

代码：`lib/services/tray_service.dart`

### 复用
- 抽出统一的 GitHub 跳转服务，避免 UI/Tray 重复写 URL/launch 逻辑。

代码：`lib/services/github_service.dart`

## 手动验证
1. 打开设置弹窗：GitHub Star 按钮位于顶部区域，不再在最底部。
2. 右键 tray：菜单包含 “在 GitHub 上点星”，点击能打开浏览器（外部应用模式）。

