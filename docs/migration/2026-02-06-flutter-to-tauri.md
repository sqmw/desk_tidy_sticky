# Flutter(Dart) -> Tauri(Rust + SvelteKit) 迁移说明（2026-02-06）

## 迁移目标

- 将 Flutter Windows Desktop 版本的“桌面贴纸 / 置顶置底 / 鼠标穿透(交互开关) / 托盘入口 / 快捷键”等关键能力，在当前 Tauri 版本中对齐。
- 保留现有 Tauri 的数据结构与本地 `notes.json` 存储方式，并兼容旧 Dart 版本的数据迁移路径（见 `README.md`）。

## 已完成对齐点（本次改动）

### 0) Logo / App Icon / Tray Icon 资源迁移

- 迁移 Flutter 版图标资源到 Tauri：
  - App 打包图标：覆盖 `src-tauri/icons/icon.ico`、`src-tauri/icons/32x32.png`、`src-tauri/icons/128x128.png`、`src-tauri/icons/128x128@2x.png`、`src-tauri/icons/icon.png`
  - 应用 Logo：`static/logo.svg`
- Tray 图标显式指定（避免默认图标/缺失）：
  - `src-tauri/src/lib.rs` 中 `TrayIconBuilder::icon(Image::from_bytes(...))`
  - Windows 端优先使用 `.ico`（`src-tauri/icons/icon.ico`）作为 Tray icon，避免 PNG 在托盘缩放/alpha 处理异常
  - `src-tauri/Cargo.toml` 启用 `tauri` 的 `image-ico` feature 用于从 ico bytes 加载 Image

### 1) “置顶 vs 桌面底层”与窗口行为对齐

- 每个置顶便笺使用独立窗口（label：`note-{id}`）。
- `note.isAlwaysOnTop = true`：
  - 窗口 `AlwaysOnTop=true`
  - 从桌面底层分离（`unpin_window_from_desktop`）
- `note.isAlwaysOnTop = false`：
  - 窗口 `AlwaysOnTop=false`
  - 自动附着到 WorkerW（`pin_window_to_desktop`），达到“桌面底层”贴纸效果

对应实现：
- 前端：`src/routes/note/[id]/+page.svelte`
- 后端：`src-tauri/src/windows.rs`（WorkerW attach/detach）

### 2) 鼠标交互开关（Click-through / 输入穿透）

- 新增全局快捷键：`Ctrl+Shift+O`，用于切换所有便笺窗口的鼠标交互（穿透/可点）。
- 托盘菜单增加：
  - `Overlay: Toggle mouse interaction`
  - `Overlay: Close`

对应实现：
- 后端：`src-tauri/src/lib.rs`
  - `OverlayInputState` 保存全局状态
  - 对所有 `note-*` 窗口应用 `set_ignore_cursor_events`
- 前端：`src/routes/note/[id]/+page.svelte`
  - 监听事件 `overlay_input_changed`，对当前窗口应用 `setIgnoreCursorEvents`

### 3) 置顶窗口的“僵尸窗口”清理

- 主面板每次加载笔记后会同步窗口：
  - 创建缺失的 `note-*` 窗口（仍然 pinned 且 active）
  - 关闭不应存在的 `note-*` 窗口（已取消 pinned / 已归档 / 已删除）

对应实现：
- `src/routes/+page.svelte`：`syncWindows()`

### 4) Tray 菜单补齐：New note / Overlay toggle

- Tray 菜单新增 `New note`：
  - 打开主面板并触发前端聚焦输入框，进入快速新建
- `Desktop overlay` 菜单行为对齐为“切换贴纸显示”：
  - 若当前存在任何 `note-*` 窗口则全部关闭
  - 若不存在则触发主面板重新 `loadNotes + syncWindows`（打开 pinned 的贴纸窗口）

## 手动验证清单

1. `pnpm tauri dev`
2. 主面板中将某条便笺“置顶”，会创建 `note-*` 窗口
3. 在便笺窗口中点击“⬆/⬇”切换：
   - ⬆：置顶（浮在最上层）
   - ⬇：贴到桌面底层（WorkerW）
4. 按 `Ctrl+Shift+O`：
   - 所有便笺窗口在“可点击编辑 / 鼠标穿透”之间切换
5. 将便笺归档或删除：
   - 对应 `note-*` 窗口应自动关闭
6. Tray 菜单：
   - `New note`：主面板弹出并聚焦输入框
   - `Desktop overlay`：切换 pinned 贴纸窗口的显示/隐藏

### 5) UI：隐藏滚动条（保留滚动能力）

- 主面板外层禁用页面滚动条（避免右侧出现整页 scrollbar）。
- 笔记列表区域隐藏 scrollbar，但仍可滚轮滚动。
- 对应实现：`src/routes/+page.svelte`

### 6) UI：无边框窗口拖拽（标题不可选中）

- 通过 `data-tauri-drag-region` 设置 header 为可拖拽区域。
- 若 `data-tauri-drag-region` 在某些环境下失效，使用 `getCurrentWindow().startDragging()` 作为兜底（绑定在标题区域 `mousedown`）。
- 使用 `startDragging()` 需要开启权限：`src-tauri/capabilities/default.json` 增加 `core:window:allow-start-dragging`。
- Dev 模式下若拖拽仍无反应，可打开 DevTools Console 查看 `[drag] ...` 调试日志，确认事件是否触发与 `startDragging()` 是否被调用/报错。
- 对交互控件区域标记 `data-tauri-drag-region="false"`，避免拖拽与点击冲突。
- header 设置 `user-select: none`，避免标题像浏览器文本一样被选中；输入框单独恢复 `user-select: text`。
- 对应实现：`src/routes/+page.svelte`

## 后续可选增强（未在本次实现）

- 托盘菜单补齐“新建便笺/显示面板”等更细粒度入口（当前已保留 `Show notes`）。
- 将“贴纸模式”状态（是否 click-through）持久化到 `preferences.json`。
- 若需要 NSIS 安装包（exe），需要处理 NSIS 下载偶发 EOF（见 `docs/build/2026-02-06-windows-bundle-nsis-eof.md`）。
