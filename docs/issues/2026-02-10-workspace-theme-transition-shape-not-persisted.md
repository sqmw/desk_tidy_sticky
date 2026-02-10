# 工作台主题扩散形状未持久化（2026-02-10）

## 问题现象
用户在工作台把主题切换形状改为“爱心扩散”后，重开仍表现为“圆形扩散”。

## 根因
前端已保存 `workspaceThemeTransitionShape`，但 Rust 端 `PanelPreferences` 缺少对应字段，导致：
1. 保存时字段被忽略；
2. 读取时前端拿不到值，只能回退默认 `circle`。

## 修复
在 Rust 偏好结构新增字段并提供默认值：
1. `workspace_theme_transition_shape: String`
2. 默认函数：`default_workspace_theme_transition_shape() -> "circle"`

## 影响文件
1. `src-tauri/src/preferences.rs`

## 验证
1. 在工作台右上角切换到“爱心扩散”。
2. 关闭并重新打开窗口/应用后，扩散形状保持为“爱心扩散”。
