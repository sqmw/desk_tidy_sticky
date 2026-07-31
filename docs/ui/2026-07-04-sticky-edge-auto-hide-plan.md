# 2026-07-04 贴纸自动贴边隐藏方案

## Situation

类型：`功能缺口 / 新功能方案`

当前 Tauri 版已经具备独立 `note-*` 贴纸窗口、拖动后位置持久化、桌面层 / 置顶层切换、全局快捷键和托盘入口；贴边隐藏已可用，但曾缺少从可见边直接唤回、显示器工作区归一化和编辑浮岛几何隔离，导致隐藏后难以拖回或可见边完全落到屏幕外。

2026-07-31 已补齐边缘唤回闭环：隐藏边支持触控板双指滚动或鼠标滚轮唤回，也保留点击入口；窗口创建时统一校正到当前显示器工作区。

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

1. 实现两种隐藏触发源，且都只作用于已经钉在桌面并处于置顶显示的贴纸：
   - `溢边隐藏`：贴纸被拖到屏幕边缘并且部分超出屏幕边界，说明用户有隐藏意愿。
   - `快捷键隐藏`：用户按快捷键时隐藏当前“编辑中的顶层贴纸”，也就是最近编辑过的置顶贴纸。
2. 用户通过全局快捷键可把隐藏贴纸显示回来；贴纸工具栏提供“允许溢边隐藏”开关。
3. 隐藏能力不破坏现有置顶 / 桌面层 / 壁纸层 / 鼠标穿透 / macOS 非激活面板行为。
4. 位置和隐藏状态应可恢复；重启或显示器拓扑变化后，隐藏态必须保持恰好 `8px` 正文可见边，普通态必须完整位于某个显示器工作区。

非目标：

- 不做仅悬浮即自动展开，避免路过屏幕边缘时误触；必须在可见边上产生滚动手势或点击。
- 不把所有贴纸强行纳入溢边隐藏；溢边隐藏默认关闭，按单张贴纸开启。
- 不支持未钉在桌面、非置顶显示或普通面板窗口自动隐藏；这些窗口应继续使用现有关闭 / 隐藏 / 置顶逻辑。
- 不在实现阶段继续扩大旧 Flutter 兼容层字段，除非需要迁移旧数据。

## Action

### 1. 数据模型

建议在 `Note` 上新增最小状态字段，仍保持单张贴纸自描述：

| 字段 | 类型 | 含义 |
|---|---|---|
| `autoHideEnabled` | `bool` | 单张贴纸是否启用溢边隐藏，默认 `false` |
| `autoHideEdge` | `Option<String>` | `left / right / top / bottom`，最近一次吸附边 |
| `autoHideState` | `Option<String>` | `visible / hidden`，运行时恢复用 |
| `autoHideReason` | `Option<String>` | `overflow / shortcut`，最近一次隐藏触发源 |
| `autoHideVisibleX` / `autoHideVisibleY` | `Option<f64>` | 完整显示时贴纸正文左上角 |
| `autoHideHiddenX` / `autoHideHiddenY` | `Option<f64>` | 收起后贴纸正文左上角 |

不建议把隐藏状态只放在前端内存里。原因是贴纸窗口可能被关闭、重建、跨平台重启，只有写入 note 数据才能稳定恢复。

隐藏能力的运行时前置条件不建议只靠 `autoHideEnabled` 表达。实现时应额外检查：

1. note 当前已 pinned，且对应 `note-*` 贴纸窗口存在。
2. 当前显示模式是置顶显示。
3. 当前窗口所在 monitor 可解析，或能够安全回退到 primary / virtual screen。

触发源还需要各自检查：

- 溢边隐藏：要求 `autoHideEnabled=true`、当前不在编辑态、拖动 / resize 已结束，并且窗口 rect 已经超出当前 monitor。
- 快捷键隐藏：要求存在 `activeTopmostEditingNoteId`；它可以是正在编辑中的贴纸，也可以是最近刚编辑过的贴纸，不依赖 `autoHideEnabled`。

任一通用条件不满足时，`autoHideEnabled` 可以保留为用户偏好，但不得实际执行溢边收起；快捷键隐藏也应直接 no-op 并给出轻量状态反馈。

快捷键隐藏还需要维护一个运行时目标：

- `activeTopmostEditingNoteId`：最近编辑过、且仍处于 pinned + 置顶显示状态的 note id。
- 这个目标应由 `note-*` 窗口在进入编辑态、文本变更、提交编辑或获得前台交互时刷新。
- 如果目标贴纸取消钉住、切到非置顶、归档 / 删除或窗口关闭，应清空该目标，避免快捷键误藏旧贴纸。

默认参数建议放到偏好或常量中：

| 参数 | 默认值 | 测试态建议 | 说明 |
|---|---:|---:|---|
| `overflowHideThresholdPx` | `1` | `1` | 超出屏幕边多少像素认为有溢边隐藏意图 |
| `hiddenSliverPx` | `8` | `16` | 收起后保留的可见边宽 |
| `autoHideDelayMs` | `0` | `0` | 当前实现为拖动结束后立即交给后端判定，后续可按体验再加延迟 |
| `revealDurationMs` | `120` | `0` | 显示 / 收起动画时长；第一阶段可先无动画 |

测试态切换方式建议用 debug preference 或开发环境变量，例如 `STICKY_AUTO_HIDE_TEST_MODE=1`，避免把测试值写死进业务逻辑。

当前落地的真实运行验证入口：

- 环境变量：`DESK_TIDY_STICKY_RUNTIME_CHECK=sticky_auto_hide`
- 默认状态：未设置时完全不运行。
- 行为：启动真实 Tauri 进程后，在当前数据目录创建一张测试贴纸，创建真实 `note-*` 窗口，调用同一套 `hide_active_topmost_editing_sticky` / `toggle_hidden_stickies` 命令，校验 hidden / visible 状态写回，然后自动退出。
- 隔离建议：运行验证时使用临时 `HOME` 或后续专用数据目录，避免写入正式 notes。

### 2. 边缘检测

当前实现把边缘检测放在 Rust 侧 `src-tauri/src/desktop/sticky/auto_hide.rs`。原生窗口在控制态会包含顶部、底部和左右透明预留，因此先由 note 的正文尺寸和持久化位置推导 `WindowGeometry`，所有边缘检测、隐藏位置和恢复夹取都只使用正文矩形；移动原生窗口前再减去运行时预留偏移。这样编辑浮岛不会吃掉屏幕内必须保留的可见边。

显示器边界使用 Tauri `Monitor::work_area()`，避开 macOS 菜单栏和 Windows 任务栏。`normalize_note_window_position` 在贴纸窗口首次就绪时执行：hidden 状态沿既有边严格保留 `8px` 正文可见边，visible 状态把正文完整夹取到最近显示器工作区；原显示器已断开时不继续保留失效屏外坐标。

溢边隐藏不再使用“靠近边缘”作为唯一判断。第一版应以窗口 rect 是否超出当前 monitor 为主要信号：

- `left`：`window.x < monitor.x - overflowHideThresholdPx`
- `right`：`window.x + window.width > monitor.x + monitor.width + overflowHideThresholdPx`
- `top`：`window.y < monitor.y - overflowHideThresholdPx`
- `bottom`：`window.y + window.height > monitor.y + monitor.height + overflowHideThresholdPx`

如果同时溢出多个边，优先选择溢出距离最大的边；距离相同再按最近拖动方向或上一条 `autoHideEdge` 兜底。快捷键隐藏不要求溢边，直接选择当前窗口最近的屏幕边；若 note 仍有上次 `autoHideEdge`，可优先沿用该边。

优先用当前窗口所在 monitor，而不是整个 virtual screen。多屏场景下，如果贴纸在两个屏幕交界处，应选择与窗口中心点相交的 monitor；找不到时再退回 primary / virtual screen。

Rust 侧当前不额外暴露 monitor 查询命令；`hide_note_to_edge` / `reveal_note_from_edge` 内部完成 monitor 选择和坐标夹取。

### 3. 状态机

建议把逻辑收敛成有限状态，避免“拖动、快捷键、重建、穿透”互相抢状态：

| 状态 | 进入条件 | 允许动作 |
|---|---|---|
| `visible_unarmed` | 未启用、未溢边、未钉在桌面或非置顶显示 | 正常拖动 / 编辑 |
| `docked_visible` | 已钉在桌面、置顶显示、启用溢边隐藏且窗口发生溢边 | 延迟收起 / 取消启用 / 手动拖离 |
| `hidden` | 已移动到隐藏坐标 | 快捷键显示 / 按钮显示 / 取消启用 |
| `revealed` | 从隐藏状态临时显示 | 再次快捷键收起 / 用户拖动则变为 `visible_unarmed` |

关键规则：

1. 溢边自动收起只允许作用于“已钉在桌面 + 置顶显示 + autoHideEnabled”的贴纸。
2. 用户主动拖动贴纸时，如果当前是 `hidden`，先切回完整显示位置再开始拖动。
3. 拖动结束后才计算溢边隐藏，拖动过程中不写隐藏坐标。
4. 贴纸进入编辑态时不触发溢边隐藏，避免正在输入时窗口消失。
5. 快捷键隐藏只作用于 `activeTopmostEditingNoteId` 指向的最近编辑顶层贴纸；它不依赖 `autoHideEnabled`，也不要求窗口已经溢边。
6. 用户拖离边缘并完整回到屏幕内后，清空 `autoHideEdge`，状态回到 `visible_unarmed`。
7. 取消钉住、归档、删除、关闭窗口时，不额外执行自动隐藏，只走现有窗口同步。

### 4. 后端命令

已新增 `src-tauri/src/desktop/sticky/auto_hide.rs`，避免继续把 `sticky/mod.rs` 堆大：

- `set_note_auto_hide_enabled(id, enabled, sort_mode)`
- `hide_note_to_edge(id, reason)`：读取 note、置顶 / 钉住状态和窗口尺寸；`reason=overflow` 时还要求 `autoHideEnabled=true` 且窗口已溢边，`reason=shortcut` 时要求 id 是最近编辑顶层贴纸。
- `reveal_note_from_edge(id)`：移动到 `autoHideVisibleX/Y`，必要时 `show` 且不激活。
- `normalize_note_window_position(id)`：窗口重建时校正当前显示器、工作区和可见边不变量，不广播内容变更。
- `hide_active_topmost_editing_sticky()`：快捷键隐藏入口；隐藏最近编辑过的顶层贴纸。
- `toggle_hidden_stickies()`：全局入口；如果存在 hidden 贴纸则全部显示，否则隐藏最近编辑顶层贴纸。
- `mark_active_topmost_editing_sticky(id)` / `clear_active_topmost_editing_sticky(id)`：贴纸窗口刷新或清理快捷键隐藏目标。

窗口移动应继续走无激活路径：

- Windows：复用 `move_note_window_without_activation` 的 native no-activate 逻辑。
- macOS：复用 `WebviewWindow::set_position`，并在移动后调用现有 layer sync，避免 NSPanel / desktop layer 状态丢失。

### 5. 快捷键与按钮

快捷键：

- 在现有快捷键设置上新增第三个 binding：`stickyHideBinding`。
- 默认值为 `Ctrl+Shift+H`，允许用户清空禁用。
- 注册失败 / 冲突状态复用当前 `ShortcutBindingSnapshot` UI。
- 快捷键按下时的优先语义：
  1. 如果存在 hidden 贴纸，先显示隐藏贴纸。
  2. 如果没有 hidden 贴纸，隐藏 `activeTopmostEditingNoteId` 对应的最近编辑顶层贴纸。
  3. 如果没有可用目标，不做窗口移动，只给出轻量反馈。

按钮：

- 贴纸工具栏已新增“自动隐藏”开关按钮，状态是单张贴纸的 `autoHideEnabled`。
- 自动隐藏开关表示“允许溢边隐藏”，只在贴纸已经钉在桌面且处于置顶显示时可用；其他状态可禁用或隐藏，避免用户误以为普通窗口也会自动贴边隐藏。
- 快捷键隐藏不需要在贴纸上新增单独开关，因为它的目标来自“最近编辑过的顶层贴纸”。
- 已隐藏贴纸可以通过快捷键显示；面板 / workstation 卡片上的“显示”按钮是后续入口补强。
- 已隐藏贴纸正文的可见边提供独立按钮命中区。macOS 触控板、Windows Precision Touchpad 和鼠标滚轮统一通过 Web `wheel` 事件进入阈值控制器；达到一次明确手势阈值后调用 `reveal_note_from_edge`。
- 手势只判断主轴移动量，不判断 delta 正负号。系统“自然滚动”设置会反转同一物理手势的事件符号；可见边本身不可滚动，悬浮后发生轴向滚动是更稳定的意图信号。
- 已隐藏状态在面板列表中应有可辨识状态，但不建议用大段说明文字；使用图标状态和 tooltip 即可。

托盘：

- 可选补充 `显示隐藏贴纸` 菜单项，调用同一个 `toggle_hidden_stickies()`；当前阶段未接托盘。

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

- 已扩展 `Note` 字段与 serde 默认值。
- 已增加 Rust 统一命令和最近编辑顶层贴纸 tracker。
- 已通过 `cargo check` 覆盖后端编译。

Phase 2：贴纸窗口拖动接入

- `src/routes/note/[id]/+page.svelte` 在非编辑态、启用溢边隐藏且窗口部分超出屏幕时调用后端收起命令。
- `src/routes/note/[id]/+page.svelte` 在编辑 / 输入 / 提交时刷新最近编辑顶层贴纸目标。
- 收起 / 显示后同步本地 `note` 状态，并由 `notes_changed` 驱动其他窗口刷新。

Phase 3：触发入口

- 已接贴纸工具栏自动隐藏开关。
- 已接全局快捷键 `stickyHideBinding`。
- 面板 / workstation 卡片显示按钮后续补强。

Phase 4：平台回归与补强

- 已改用正文矩形和显示器工作区计算，新增启动归一化。
- 已增加四边可见柄、触控板 / 滚轮唤回和点击兜底。
- 已将自动隐藏事件标记为 metadata，只有真实未提交草稿遇到文本事件才显示外部更新冲突。
- Windows：桌面层、置顶层、壁纸层、鼠标穿透、no-snap 回归。
- macOS：NSPanel、所有 Spaces、无激活移动、第一次显示 / 隐藏回归。
- 多屏：左侧负坐标屏、上下排列屏、断开屏幕后恢复。

## Result

推荐采用“每张贴纸持久化隐藏状态 + 统一 Rust 命令移动窗口 + 前端只负责拖动后判定、按钮状态和最近编辑目标上报”的方案。

隐藏触发拆成两条：

- 溢边隐藏：用户把置顶贴纸拖出屏幕边界，且单张贴纸开启 `autoHideEnabled`。
- 快捷键隐藏：用户按快捷键时隐藏最近编辑过的顶层贴纸，不要求溢边，也不依赖 `autoHideEnabled`。

这样做的收益：

- 贴纸窗口重建后能恢复，不依赖前端内存。
- 快捷键、托盘、按钮都走统一后端移动命令，行为一致。
- 自动隐藏逻辑不会侵入 Markdown 编辑器、workstation 列表或旧 Flutter 兼容层。

主要风险：

- macOS NSPanel 层级同步存在时序风险，需要重点做第一次 hide/reveal 验证。
- 多屏坐标和缩放比例容易出错，edge 计算必须先用纯函数覆盖。
- 如果把 hover 自动展开放进第一版，会和鼠标穿透 / 桌面层交互冲突，建议后置。

验收建议：

1. 单张贴纸在已钉在桌面且置顶显示时开启溢边隐藏，拖到左 / 右 / 上 / 下任一方向并部分超出屏幕后，只留下 `hiddenSliverPx` 可见边。
2. 快捷键在没有 hidden 贴纸时，会隐藏最近编辑过的顶层贴纸。
3. 快捷键在存在 hidden 贴纸时，会优先显示隐藏贴纸。
4. 面板 / workstation 的按钮能显示指定隐藏贴纸。
5. 编辑态和控制态拖动结束都不触发溢边隐藏；快捷键仍可隐藏最近编辑过的顶层贴纸。
6. 未钉在桌面、非置顶显示或普通面板窗口不会触发自动隐藏。
7. 重启后隐藏贴纸可通过快捷键 / 面板按钮恢复。
8. macOS 第一次隐藏和第一次显示都一次生效。
9. 上 / 下边用垂直双指滚动唤回，左 / 右边接受水平双指滚动；鼠标滚轮作为四边兼容兜底。
10. 未修改活动块时，颜色、层级、自动隐藏等 metadata 更新不显示“草稿尚未保存”；只有实际草稿遇到同一笔记的文本更新才显示。
9. `make check`、edge 计算 smoke、Windows/macOS 手动回归通过。

## 待确认

1. 默认快捷键是否采用 `Ctrl+Shift+H`，还是默认留空只提供按钮入口。
2. 第一版是否允许“溢出任意边自动隐藏”，还是只支持左 / 右边。
3. 隐藏后保留边宽默认 `8px` 是否合适。
4. 是否需要托盘菜单项，还是先只做全局快捷键和面板 / 贴纸按钮。
