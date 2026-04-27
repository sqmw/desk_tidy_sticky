# 2026-04-27 托盘/菜单栏图标交互调整

## 背景

- 之前托盘/菜单栏图标配置为左键直接弹出菜单：
  - `src-tauri/src/desktop/tray.rs`
  - `show_menu_on_left_click(true)`
- 这会把“打开主窗口”和“GitHub Star / 贴纸开关 / 退出”等菜单动作混在同一层入口里。
- 新的产品目标是：
  - 左键更高频，直接打开主窗口
  - 右键保留当前菜单，继续承载 `Star on GitHub` 等次级动作

## 调整内容

### 1. 左键不再弹菜单

- 将托盘配置改为：
  - `show_menu_on_left_click(false)`
- 这样左键不会再自动展开菜单。

### 2. 左键单击直接显示主窗口

- 新增托盘点击事件处理：
  - 监听 `TrayIconEvent::Click`
  - 仅对 `MouseButton::Left + MouseButtonState::Up` 响应
- 动作复用现有主入口：
  - `show_preferred_panel_window(...)`

## 当前交互模型

- macOS 菜单栏图标：
  - 左键：直接显示主窗口
  - 右键：显示托盘菜单
- Windows 系统托盘图标：
  - 左键：直接显示主窗口
  - 右键：显示托盘菜单

## 保留项

- `Star on GitHub` 继续保留在右键菜单中，不移除。
- 托盘菜单中的：
  - 显示主窗口
  - 桌面贴纸开关
  - 贴纸全局操作
  - 退出
  均保持原有功能。

## 验证建议

1. 启动应用后点击 macOS 菜单栏图标 / Windows 系统托盘图标左键：
   - 应直接打开当前偏好的主窗口。
2. 对同一图标右键：
   - 应显示托盘菜单。
3. 在右键菜单中点击 `Star on GitHub`：
   - 应继续正常打开项目 GitHub 页面。
