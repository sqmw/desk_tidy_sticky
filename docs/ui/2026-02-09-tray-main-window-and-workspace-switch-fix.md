# 2026-02-09 托盘主窗口入口与工作台切换修复

## 问题
1. 托盘菜单文案与行为仍是“显示便笺”，需求改为“显示主窗口”。
2. 从托盘进入后点击“打开工作台”，出现“主窗口消失但工作台未出现”的切换失败。
3. 工作台窗口仍使用原生窗口栏，不符合“工作台 UI 自定义”的要求。

## 修复方案
### 1) 托盘行为调整为主窗口优先
- 文件：`src-tauri/src/lib.rs`
- 变更：
  - 托盘默认文案改为 `Show main window`。
  - `update_tray_texts` 优先读取 `trayShowMain`（兼容 `trayShowNotes`）。
  - 点击托盘 `show` 时，先隐藏 `workspace`，再显示并聚焦 `main`。
- 文件：`src/lib/strings.js`
  - 新增并设置 `trayShowMain`。
  - `trayShowNotes` 保持兼容并同文案。

### 2) 工作台切换可靠性修复（防止主窗口先消失）
- 文件：`src/lib/panel/switch-panel-window.js`
- 变更：
  - 新增 `workspace_ready` 握手机制。
  - 切换到工作台时，只有在工作台页面确认 ready 后才隐藏主窗口。
  - 若 ready 超时，保留主窗口作为回退，避免“两个都看不到”。

### 2.1) 单实例唤醒强制回到简洁主窗口
- 文件：`src-tauri/src/lib.rs`
- 变更：
  - 单实例回调触发时，先隐藏 `workspace`，再显示并聚焦 `main`。
  - 保证“再次点击应用图标唤醒”始终回到简洁主窗口。

## 后续修正（记忆上次窗口模式）
根据后续反馈，tray/singleton 不应总是打开简洁窗口，而应记住上次使用的主窗口类型：

1. 偏好新增字段
- 文件：`src-tauri/src/preferences.rs`
- 新增：
  - `last_panel_window`（`main` / `workspace`，默认 `main`）
  - `read_last_panel_window()`

2. tray/singleton 按偏好打开
- 文件：`src-tauri/src/lib.rs`
- 新增 `show_preferred_panel_window(app)`：
  - 如果偏好是 `workspace` 且窗口存在 -> 显示 `workspace` 并隐藏 `main`
  - 否则 -> 显示 `main`（并隐藏 `workspace`）
- tray `show` 与 single-instance 回调都改为调用该函数。

3. 窗口切换时写回偏好
- 文件：`src/lib/panel/switch-panel-window.js`
- 在切换 `main/workspace` 时写回 `lastPanelWindow`，保证下次 tray/singleton 行为一致。

### 3) 工作台窗口改为自定义窗口栏
- 文件：`src/lib/panel/switch-panel-window.js`
  - `workspace` 窗口改为 `decorations: false`（禁用原生标题栏）。
- 文件：`src/routes/workspace/+page.svelte`
  - 页面挂载后发出 `workspace_ready` 事件。
  - 增加自定义拖拽能力（`startDragging`）。
- 文件：`src/lib/components/workspace/WorkspaceWindowBar.svelte`
  - 将拖拽区域扩大为整条顶部栏（按钮区除外）。
  - 按钮区 `pointerdown` 阻断，避免误触发拖拽。
  - 解决“工作台几乎没有可拖拽区域”的交互问题。
- 新增组件：
  - `src/lib/components/workspace/WorkspaceWindowBar.svelte`
  - `src/lib/components/workspace/WorkspaceSidebar.svelte`
  - `src/lib/components/workspace/WorkspaceToolbar.svelte`
  - 通过拆分组件降低 `workspace` 页面耦合。

## 验证
1. `npm run check`：通过（0 errors / 0 warnings）
2. `cargo check`：通过（仅既有 warning）
