# Tauri 后端功能包拆分

日期：2026-04-13  
范围：`src-tauri/src` 后端模块结构

## 背景
- 原始 `src-tauri/src/lib.rs` 承载过多职责：
  - Tauri builder / plugin / invoke handler 组装
  - 全局运行时状态
  - panel 窗口显隐、最小化、Dock/taskbar 壳状态
  - macOS break overlay 跨屏创建与 presentation 生命周期
  - break reminder watchdog 到点判定
  - 贴纸窗口层级、托盘、笔记命令、偏好设置、旧数据迁移
- 第一轮已经把大入口拆成多个文件，但文件仍平铺在 `src-tauri/src` 下，定位边界不够清晰。
- 本轮继续按功能职责分包，让顶层目录表达领域边界。

## 当前包结构

```text
src-tauri/src
├── breaks
│   ├── mod.rs
│   ├── overlay.rs
│   └── reminder.rs
├── desktop
│   ├── mod.rs
│   ├── panel.rs
│   ├── sticky
│   │   ├── layer.rs
│   │   └── mod.rs
│   └── tray.rs
├── lib.rs
├── main.rs
├── notes
│   ├── assets.rs
│   ├── commands.rs
│   ├── compat
│   │   ├── flutter_legacy
│   │   │   └── legacy_paths.rs
│   │   ├── flutter_legacy.rs
│   │   └── mod.rs
│   ├── domain.rs
│   ├── mod.rs
│   ├── model.rs
│   ├── repository.rs
│   └── service.rs
├── platform
│   ├── macos.rs
│   ├── mod.rs
│   ├── window_handle.rs
│   └── windows
│       ├── mod.rs
│       ├── window_style.rs
│       └── workerw
│           ├── discovery.rs
│           └── mod.rs
├── preferences
│   ├── commands.rs
│   ├── mod.rs
│   └── model.rs
└── runtime
    ├── mod.rs
    ├── paths.rs
    └── state.rs
```

## 包边界

### `breaks/`
- `overlay.rs`：休息 overlay 原生窗口生命周期、monitor bounds、presentation 恢复。
- `reminder.rs`：休息提醒 watchdog、墙钟到点判定、去重、事件发出。
- 约束：只处理“休息提醒/休息遮罩”，不承载普通贴纸窗口、托盘或笔记业务。

### `desktop/`
- `panel.rs`：`main/workspace` panel 窗口生命周期、Dock/taskbar 壳状态。
- `sticky/mod.rs`：贴纸相关 Tauri command 入口，例如 pin/unpin、sync layer、toggle z-order/wallpaper。
- `sticky/layer.rs`：贴纸窗口层级策略、点击穿透状态应用、跨平台 topmost/wallpaper 映射。
- `tray.rs`：托盘菜单创建、文案同步、菜单事件分发。
- 约束：只处理桌面窗口与桌面入口，不承载笔记持久化和偏好模型。

### `notes/`
- `model.rs`：笔记数据模型。
- `domain.rs`：笔记纯领域规则，例如排序模式、排序规则、标签规范化。
- `commands.rs`：Tauri 笔记命令层，只做参数适配和 `notes_changed` 事件。
- `service.rs`：笔记业务动作，例如新增、修改、置顶、归档、删除、重排。
- `repository.rs`：`notes.json` 读写、Flutter 旧数据发现、渐进迁移、迁移验证。
- `assets.rs`：剪贴板图片附件保存。
- `compat/flutter_legacy.rs`：Flutter 旧版笔记结构兼容解析、稳定 ID、去重、读写适配。
- `compat/flutter_legacy/legacy_paths.rs`：Flutter 旧版笔记路径发现。
- 约束：命令层、业务层、仓储层、兼容层分开，避免后续修一个笔记动作时牵动路径发现或附件保存。

### `preferences/`
- `model.rs`：`PanelPreferences`、默认值、偏好路径、轻量读取 helper。
- `commands.rs`：Tauri 偏好设置命令层。
- 约束：偏好模型和命令适配分开；共享数据目录从 `runtime/paths.rs` 获取。

### `platform/`
- `macos.rs`：macOS 原生窗口能力。
- `window_handle.rs`：跨模块复用的窗口 handle 获取与 macOS main-thread window op。
- `windows/workerw/mod.rs`：Windows WorkerW attach/detach、SetParent 验证、置底回退。
- `windows/workerw/discovery.rs`：Windows WorkerW / Wallpaper WorkerW 发现与枚举。
- `windows/window_style.rs`：Windows topmost/no-activate、no-snap / keep-resizable style 调整。
- `windows/mod.rs`：Windows 平台 API re-export。
- 约束：平台细节不再放在 `lib.rs` 或桌面业务文件里。

### `runtime/`
- `paths.rs`：统一应用数据目录基准。
- `state.rs`：跨模块共享运行时状态，例如贴纸点击穿透状态、休息提醒 watchdog 状态、break overlay presentation 状态。
- 约束：只承载低层运行时基础设施，不直接调用窗口创建或笔记业务。

### `lib.rs`
- 保留：
  - Tauri builder / plugin / invoke handler 组装
  - 全局快捷键
  - app setup / run event 分发
- 约束：
  - 不再承载业务实现；
  - 新功能优先进入对应功能包，再由 `lib.rs` 注册命令或启动入口。

## 当前收益
- `lib.rs` 从约 1449 行降到约 183 行。
- `notes_service.rs` 从约 648 行降到 `notes/service.rs` 约 326 行。
- 原 `windows.rs` 从约 432 行降到 `platform/windows/mod.rs` 约 7 行，具体逻辑分到 `workerw/` 与 `window_style.rs`。
- `desktop/sticky` 继续拆出 `sticky/layer.rs`，把层级策略从 Tauri command 入口中分离。
- `platform/windows/workerw` 继续拆出 `discovery.rs`，把 WorkerW 枚举发现从 attach/detach 父窗口操作中分离。
- `notes/compat` 继续拆出 `flutter_legacy/legacy_paths.rs`，把旧数据路径发现从 JSON 字段解析和 Note 映射中分离。
- 后端顶层不再平铺十几个业务文件，排查路径变为：
  - 休息提醒：`breaks/`
  - 桌面窗口/托盘/贴纸：`desktop/`
  - 笔记业务/迁移/附件：`notes/`
  - 偏好设置：`preferences/`
  - 原生平台能力：`platform/`
  - 共享运行时基础设施：`runtime/`

## 后续建议
1. `notes/compat/flutter_legacy.rs` 仍然偏长，但已经移除了路径发现；如果继续扩张，再拆“字段解析 / Note 映射 / 去重”。
2. `desktop/sticky/mod.rs` 仍保留命令入口和部分平台调用；如果后续继续修贴纸层级，再拆 `commands.rs` 和 `platform_adapter.rs`。
3. `platform/windows/workerw/mod.rs` 已只保留 attach/detach 操作；如果继续修 WorkerW，可再拆 SetParent 验证和置底回退。
4. 后端现在再拆的边际收益开始下降；下一阶段更值得处理的是前端 `WorkspaceFocusHub.svelte`。

## 验证
- 已执行：
  - `cargo check` in `src-tauri`
  - `cargo fmt --check` in `src-tauri`
  - `pnpm check` in repo root
  - `git diff --check`
- 目标：
  - 编译通过；
  - Rust 格式检查通过；
  - Svelte 检查 0 errors / 0 warnings；
  - 模块移动不改变业务行为。
