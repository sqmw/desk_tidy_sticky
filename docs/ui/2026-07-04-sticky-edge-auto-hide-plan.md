# 2026-07-04 贴纸自动贴边隐藏方案

## Situation

类型：`功能缺口 / 新功能方案`

当前 Tauri 版已经具备独立 `note-*` 贴纸窗口、拖动后位置持久化、桌面层 / 置顶层切换、全局快捷键和托盘入口；但还没有“贴纸移动到屏幕边缘后自动贴边隐藏，再由快捷键或按钮唤回”的完整机制。

本轮只写方案，不改运行代码。

## 参考结论

可参考的 Flutter 旧实现位于当前仓库历史分支 `origin/dev-flutter`。没有找到已实现的“自动隐藏”成品逻辑，但以下机制可复用思路：

- `lib/pages/note_window/note_window_page.dart`
  - `_edgeSnapThreshold = 8`：用边缘阈值判断贴纸是否贴近屏幕边。
  - `_scheduleEdgeAlignmentUpdate()`：拖动 / 尺寸变化后防抖计算贴近的边。
  - `_clampToScreenIfNeeded()`：贴纸超出虚拟屏幕时夹回可见区域。
  - `_schedulePersistPosition()`：拖动结束后防抖保存 `x / y`，避免高频写盘。
- `lib/services/sticky_note_window_manager.dart`
  - 一个 pinned note 对应一个原生窗口。
  - 同步阶段只创建缺失窗口、关闭不应存在窗口，避免全局闪烁。
- `lib/services/hotkey_service.dart` / `lib/services/tray_service.dart`
  - 快捷键和托盘入口都只调用统一的运行时控制器，不直接改业务数据。

当前 Tauri 版已有对应落点：

- 前端拖动：`src/lib/note/note-window-drag.js`
- 贴纸窗口页：`src/routes/note/[id]/+page.svelte`
- 位置持久化：`src-tauri/src/notes/commands.rs` 的 `update_note_position`
- 窗口层级 / 无激活移动：`src-tauri/src/desktop/sticky/mod.rs`
- 快捷键设置：`src-tauri/src/desktop/shortcuts.rs`、`src/lib/shortcuts/shortcut-settings-service.js`
- 偏好设置：`src-tauri/src/preferences/model.rs`

## Task

目标：

1. 贴纸被拖到屏幕任一边缘后，可按配置自动收起，只保留一条可见边。
2. 用户通过全局快捷键、贴纸按钮、面板 / workstation 卡片按钮触发时，可把隐藏贴纸显示回来。
3. 自动隐藏不破坏现有置顶 / 桌面层 / 壁纸层 / 鼠标穿透 / macOS 非激活面板行为。
4. 位置和隐藏状态应可恢复；重启后不应出现贴纸完全丢失到屏幕外的情况。

非目标：

- 不在第一阶段做鼠标 hover 自动展开；快捷键和按钮优先，hover 可作为后续增强。
- 不把所有贴纸强行纳入自动隐藏；默认关闭，按单张贴纸开启。
- 不在实现阶段继续扩大旧 Flutter 兼容层字段，除非需要迁移旧数据。

## Action

### 1. 数据模型

建议在 `Note` 上新增最小状态字段，仍保持单张贴纸自描述：

| 字段 | 类型 | 含义 |
|---|---|---|
| `autoHideEnabled` | `bool` | 单张贴纸是否启用自动贴边隐藏，默认 `false` |
| `autoHideEdge` | `Option<String>` | `left / right / top / bottom`，最近一次吸附边 |
| `autoHideState` | `Option<String>` | `visible / hidden`，运行时恢复用 |
| `autoHideVisibleX` / `autoHideVisibleY` | `Option<f64>` | 完整显示时的位置 |
| `autoHideHiddenX` / `autoHideHiddenY` | `Option<f64>` | 收起后的位置 |

不建议把隐藏状态只放在前端内存里。原因是贴纸窗口可能被关闭、重建、跨平台重启，只有写入 note 数据才能稳定恢复。

默认参数建议放到偏好或常量中：

| 参数 | 默认值 | 测试态建议 | 说明 |
|---|---:|---:|---|
| `edgeSnapThresholdPx` | `12` | `4` | 距离屏幕边多少像素认为可吸附 |
| `hiddenSliverPx` | `8` | `16` | 收起后保留的可见边宽 |
| `autoHideDelayMs` | `350` | `50` | 拖动结束后多久执行收起 |
| `revealDurationMs` | `120` | `0` | 显示 / 收起动画时长；第一阶段可先无动画 |

测试态切换方式建议用 debug preference 或开发环境变量，例如 `STICKY_AUTO_HIDE_TEST_MODE=1`，避免把测试值写死进业务逻辑。

### 2. 边缘检测

新增纯函数模块，例如 `src/lib/note/note-edge-auto-hide.js`：

- 输入：窗口 `position / size`、当前 monitor rect、阈值、隐藏边宽。
- 输出：
  - 最近边：`left / right / top / bottom / null`
  - 完整显示位置：`visiblePosition`
  - 收起位置：`hiddenPosition`
  - 是否需要夹回屏幕：`clampedPosition`

优先用当前窗口所在 monitor，而不是整个 virtual screen。多屏场景下，如果贴纸在两个屏幕交界处，应选择与窗口中心点相交的 monitor；找不到时再退回 primary / virtual screen。

Rust 侧需要提供或复用 monitor 信息。当前 `reset_pinned_note_positions` 已经使用 monitor 信息，可以抽一个命令：

- `get_note_window_monitor_rect(label)`：返回当前窗口所在 monitor 的逻辑坐标。
- 或 `get_display_monitor_rects()`：前端按窗口中心点选择。

### 3. 状态机

建议把逻辑收敛成有限状态，避免“拖动、快捷键、重建、穿透”互相抢状态：

| 状态 | 进入条件 | 允许动作 |
|---|---|---|
| `visible_unarmed` | 未启用或不靠边 | 正常拖动 / 编辑 |
| `docked_visible` | 启用且拖到边缘 | 延迟收起 / 取消启用 / 手动拖离 |
| `hidden` | 已移动到隐藏坐标 | 快捷键显示 / 按钮显示 / 取消启用 |
| `revealed` | 从隐藏状态临时显示 | 再次快捷键收起 / 用户拖动则变为 `visible_unarmed` |

关键规则：

1. 用户主动拖动贴纸时，如果当前是 `hidden`，先切回完整显示位置再开始拖动。
2. 拖动结束后才计算自动隐藏，拖动过程中不写隐藏坐标。
3. 贴纸进入编辑态时不自动收起，避免正在输入时窗口消失。
4. 用户拖离边缘超过阈值后，清空 `autoHideEdge`，状态回到 `visible_unarmed`。
5. 取消钉住、归档、删除、关闭窗口时，不额外执行自动隐藏，只走现有窗口同步。

### 4. 后端命令

建议新增一个小的 `desktop::sticky_auto_hide` 模块，避免继续把 `sticky/mod.rs` 堆大：

- `set_note_auto_hide(id, enabled, edge?, state?, visible_x?, visible_y?, hidden_x?, hidden_y?)`
- `hide_note_to_edge(id)`：读取 note 和窗口尺寸，计算隐藏坐标并移动窗口。
- `reveal_note_from_edge(id)`：移动到 `autoHideVisibleX/Y`，必要时 `show` 且不激活。
- `toggle_hidden_stickies()`：全局快捷键入口；若存在 hidden 贴纸则全部显示，否则把已 docked 的贴纸收起。

窗口移动应继续走无激活路径：

- Windows：复用 `move_note_window_without_activation` 的 native no-activate 逻辑。
- macOS：复用 `WebviewWindow::set_position`，并在移动后调用现有 layer sync，避免 NSPanel / desktop layer 状态丢失。

### 5. 快捷键与按钮

快捷键：

- 在现有快捷键设置上新增第三个 binding：`stickyRevealBinding`。
- 建议默认值先设为 `Ctrl+Shift+H`，允许用户清空禁用。
- 注册失败 / 冲突状态复用当前 `ShortcutBindingSnapshot` UI。

按钮：

- 贴纸工具栏新增“自动隐藏”开关按钮，状态是单张贴纸的 `autoHideEnabled`。
- 已隐藏贴纸无法直接点自身完整按钮，所以还需要面板 / workstation 卡片上的“显示”按钮。
- 已隐藏状态在面板列表中应有可辨识状态，但不建议用大段说明文字；使用图标状态和 tooltip 即可。

托盘：

- 可选补充 `显示隐藏贴纸` 菜单项，调用同一个 `toggle_hidden_stickies()`。

### 6. 平台细节

Windows：

- 自动隐藏需要避开 Aero Snap 干扰，继续保留现有 no-snap 策略。
- 桌面层 / WorkerW 层移动后要重同步 z-order，避免收起后被送到图标下不可见。
- 收起位置应保留 `hiddenSliverPx`，不能完全移出屏幕。

macOS：

- 当前贴纸窗口是非激活 panel，并加入所有 Spaces；移动后要避免激活当前 App。
- 不新增 `.mm` 能力，若后续需要更细的 NSPanel 行为，优先新增 Swift 薄层。
- 需要重点验证第一次隐藏 / 第一次显示，不要重复出现“第一次点击没反应、第二次才生效”的层级 race。

多屏：

- 保存 visible / hidden 坐标时保存逻辑坐标即可，重启后若 monitor 缺失，先 clamp 到可见屏幕再显示。
- 如果隐藏边对应的屏幕不再存在，恢复为 `docked_visible`，不要继续隐藏。

### 7. 实施阶段

Phase 1：纯计算与数据落点

- 新增 edge 计算 helper 和单元 smoke。
- 扩展 `Note` 字段与 serde 默认值。
- 增加命令但先不接 UI。

Phase 2：贴纸窗口拖动接入

- `note-window-drag.js` 拖动结束后回调传入窗口尺寸和 monitor 信息。
- `src/routes/note/[id]/+page.svelte` 在非编辑态、启用自动隐藏且靠边时调度收起。
- 收起 / 显示后同步本地 `note` 状态。

Phase 3：触发入口

- 贴纸工具栏自动隐藏开关。
- 面板 / workstation 卡片显示按钮。
- 全局快捷键 `stickyRevealBinding`。

Phase 4：平台回归与补强

- Windows：桌面层、置顶层、壁纸层、鼠标穿透、no-snap 回归。
- macOS：NSPanel、所有 Spaces、无激活移动、第一次显示 / 隐藏回归。
- 多屏：左侧负坐标屏、上下排列屏、断开屏幕后恢复。

## Result

推荐采用“每张贴纸持久化自动隐藏状态 + 统一 Rust 命令移动窗口 + 前端只负责拖动后判定和按钮状态”的方案。

这样做的收益：

- 贴纸窗口重建后能恢复，不依赖前端内存。
- 快捷键、托盘、按钮都走同一条后端命令，行为一致。
- 自动隐藏逻辑不会侵入 Markdown 编辑器、workstation 列表或旧 Flutter 兼容层。

主要风险：

- macOS NSPanel 层级同步存在时序风险，需要重点做第一次 hide/reveal 验证。
- 多屏坐标和缩放比例容易出错，edge 计算必须先用纯函数覆盖。
- 如果把 hover 自动展开放进第一版，会和鼠标穿透 / 桌面层交互冲突，建议后置。

验收建议：

1. 单张贴纸开启自动隐藏，拖到左 / 右 / 上 / 下边缘后只留下 `hiddenSliverPx` 可见边。
2. 快捷键能显示所有隐藏贴纸，再次触发能收起已 docked 贴纸。
3. 面板 / workstation 的按钮能显示指定隐藏贴纸。
4. 编辑态不自动隐藏。
5. 重启后隐藏贴纸可通过快捷键 / 面板按钮恢复。
6. macOS 第一次隐藏和第一次显示都一次生效。
7. `make check`、edge 计算 smoke、Windows/macOS 手动回归通过。

## 待确认

1. 默认快捷键是否采用 `Ctrl+Shift+H`，还是默认留空只提供按钮入口。
2. 第一版是否允许“贴到任意边自动隐藏”，还是只支持左 / 右边。
3. 隐藏后保留边宽默认 `8px` 是否合适。
4. 是否需要托盘菜单项，还是先只做全局快捷键和面板 / 贴纸按钮。
