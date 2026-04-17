# 全局快捷键冲突改为软失败，并接入可编辑设置

## 背景

Windows 用户反馈应用在启动时无界面、快速退出。排查发现根因是启动阶段通过 `tauri-plugin-global-shortcut` 硬注册默认快捷键：

- `Ctrl+Shift+N`
- `Ctrl+Shift+O`

只要任意一个被其他应用占用，当前实现就会直接 `panic`，导致应用无法启动。

## 目标

1. 快捷键注册失败不再阻断应用启动。
2. 快捷键可以在设置中编辑。
3. 设置页要能展示真实注册结果，而不是只显示静态文案。
4. 保持 mini / workstation 两个入口的设置体验一致。

## 方案

### 1. 启动阶段不再硬注册

`src-tauri/src/lib.rs` 不再通过 `.with_shortcuts(...).expect(...)` 在构建阶段硬注册全局快捷键。

改为：

1. 正常构建 `global-shortcut` 插件。
2. 应用启动后读取偏好中的快捷键配置。
3. 在运行时尝试注册。
4. 把每个动作的注册结果写入共享状态并发事件给前端。

这样即使某个快捷键冲突，应用本体仍然可以正常启动。

### 2. 快捷键偏好持久化

在 `preferences.json` 中新增两个字段：

- `panelShortcut`
- `overlayShortcut`

默认值分别为：

- `Ctrl+Shift+N`
- `Ctrl+Shift+O`

同时补充了 `read_preferences()` / `write_preferences()`，避免多个调用点重复自行读写文件。

### 3. 快捷键运行时状态

后端维护 `ShortcutRuntimeState`，并对外暴露：

- `get_shortcut_settings`
- `update_shortcut_settings`

前端拿到的是完整快照，而不只是字符串值。每个快捷键包含：

- `value`
- `status`
- `message`

当前状态值：

- `registered`
- `conflict`
- `invalid`
- `disabled`
- `error`

### 4. 设置页改为可编辑

新增共享组件：

- `src/lib/components/common/ShortcutSettingsSection.svelte`

并接入：

- mini 设置弹窗
- workstation 设置弹窗

用户现在可以直接编辑两个全局快捷键，保存后立即重新注册。

设置区默认采用：

- 左侧动作标签
- 右侧快捷键输入与状态

mini 与 workstation 保持同一套表单结构，避免标签和输入被拆成上下两行。

状态展示约定：

- 仅通过“快捷键输入框内的文字颜色”表达状态（不再显示「已注册」等文案）
- 绿色：已注册
- 红色：冲突 / 格式无效 / 注册失败
- 灰色：已禁用（留空）

### 5. 冲突与禁用规则

#### 与其他应用冲突

如果快捷键被其他应用占用：

- 应用继续启动
- 该快捷键状态显示为 `conflict`
- 用户可以在设置中改成其他值

#### 与本应用另一个动作重复

如果两个动作配置成同一个快捷键：

- 两个动作都标记为 `conflict`
- 本轮不会注册任意一个

#### 置空

如果设置为空字符串：

- 该快捷键状态为 `disabled`
- 表示显式禁用该动作的全局快捷键

## 行为变化

### 切换主窗口快捷键

“切换主窗口”快捷键现在按当前面板体系工作：

1. 若当前已有 panel 窗口可见，则隐藏当前可见 panel。
2. 若当前 panel 不可见，则按 `lastPanelWindow` 打开用户上次使用的 panel（mini 或 workstation）。

这样可以避免在 workstation 可见时又额外拉起 mini，导致两个 panel 窗口同时出现。

## 前端事件

新增事件：

- `shortcut_settings_changed`

mini 与 workstation 都会监听它，用于同步显示最新注册状态。

## 回归验证

已完成：

1. `cargo check --manifest-path src-tauri/Cargo.toml`
2. `pnpm check`

建议人工补充验证：

1. 在 Windows 上人为占用 `Ctrl+Shift+N`，确认应用仍可启动。
2. 打开设置，确认冲突状态显示为红色提示。
3. 把冲突快捷键改成其他值，确认可以即时恢复为已注册。
4. 将某个快捷键清空，确认状态显示为已禁用且应用不报错。
