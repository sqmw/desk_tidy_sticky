# 2026-02-07 Overlay Interaction Topmost Policy

## Goal
修正全局交互开关与贴纸层级之间的职责边界，确保：
- 全局开关负责“临时进入全局操作态”；
- 单贴纸配置继续负责“正常状态下”的置顶 / 桌面层 / 壁纸层。

## Confirmed Product Rule
1. 贴纸层级（Windows）：
- `isAlwaysOnTop = true`：置顶显示（脱离桌面层）。
- `isWallpaper = true`：壁纸层（WorkerW 背后，图标下层）。
- `isAlwaysOnTop = false` 且 `isWallpaper = false`：桌面层（图标上层）。
2. 壁纸层切换按钮：
- 只在 `isPinned = true` 且 `isAlwaysOnTop = false` 时显示。
- 原因：`贴到壁纸层 / 贴在图标上层` 属于“底部语义”的二级切换，不应在置顶状态下同时出现，避免用户误以为两套层级可以并行生效。
3. 全局操作按钮：
- `开启`：
  - 所有贴纸临时强制提升到顶层；
  - 所有贴纸允许鼠标操作（取消 click-through）。
  - 临时提顶后的贴纸在单贴纸页内按“有效置顶态”处理：
    - 不再因 hover 自动显示工具栏；
    - 双击非交互区域进入操控态；
    - 拖动热区与真实置顶贴纸保持一致。
- `关闭`：
  - 恢复每张贴纸自己的层级语义：
    - `isAlwaysOnTop = true` => 继续置顶；
    - `isWallpaper = true` => 回到壁纸层；
    - 其他贴纸 => 回到桌面层。
- `isAlwaysOnTop = true` 的贴纸在全局操作关闭后，仍保留单贴纸交互能力，但交互入口继续区分“展示态 / 操控态 / 文本编辑态”，不再默认 hover 即显示全部操作按钮。

## 2026-04-15 补充：置顶贴纸的拖动热区
- 根因：之前实现把“置顶即可交互”简化成“hover 就显示按钮 + 预览区大面积可拖动”，导致全屏阅读场景下噪音过大，而且 hover、编辑、拖动被绑成一个状态。
- 收敛规则：
  - 展示态：
    - 置顶贴纸默认只显示内容，不因为 hover 自动露出工具栏、标签栏或拖动热区。
    - 置顶贴纸在展示态仍允许直接拖动，避免用户为了挪位置必须先进操控态。
    - 双击置顶贴纸的非交互区域，进入操控态。
    - 为避免 Windows 透明贴纸在点击时误进入拖动链路，拖动只在鼠标移动超过最小阈值后才正式开始；单击 / 双击不应触发拖动接管。
    - 为避免拖拽松手后由系统补发 `click / dblclick` 造成误触发，拖拽结束后会短暂抑制一次指针激活事件，只保留“完成拖动”语义。
    - Windows 下窗口移动不再走 WebView 默认 `setPosition`，改为原生 `SetWindowPos(SWP_NOACTIVATE | SWP_NOZORDER)`，确保拖动置顶贴纸时不抢激活、不刷新其他置顶应用的层级顺序。
    - 前端拖动状态仍以逻辑坐标保存；Windows 原生命令内部按窗口 `scale_factor` 转回物理像素，避免高 DPI 下出现拖拽错位。
    - 拖拽结束后的位置持久化不再默认广播 `notes_changed`，避免在释放瞬间触发额外的层级重应用（`apply_note_window_layer`）导致闪动或影响其他前台窗口。
  - 操控态：
    - 显示底部工具栏、顶部退出按钮和标签栏。
    - 继续允许在便笺非交互区域内直接拖动窗口。
    - `Esc` 可直接退出操控态。
  - 文本编辑态：
    - 在操控态内点击编辑进入。
    - 退出文本编辑后，仍回到操控态，而不是直接退回展示态。
    - 若在文本编辑态点击顶部关闭按钮或按 `Esc`，则保存后整体退出操控态。
    - 2026-07-07 回归修正：块编辑器内 `Esc` 不再取消当前草稿；它会先提交当前块/空笔记草稿，再触发现有贴纸退出链路，确保键盘退出与点击失焦的保存语义一致。
  - 平台化退出位：
    - macOS：顶部左侧，沿用更接近 traffic-light 的关闭语义。
    - Windows：顶部右侧，沿用右上角关闭习惯。
  - 非置顶的桌面层 / 壁纸层贴纸继续沿用旧策略，不因为这次改动改变 hover 行为。
- 结果：
  - 置顶贴纸在全屏阅读 / 看视频场景下默认更安静，不会因为 hover 打断内容。
  - 用户在展示态下仍可直接拖动贴纸调整位置，不需要多一步进入操控态。
  - 需要操控时，用户仍可以通过双击进入完整操作面板，完成拖动、编辑和样式调整。
  - 全局操作关闭时，置顶贴纸仍保留独立单贴纸交互能力，但交互入口从“hover 自动暴露”收敛为“显式进入操控态”。

## 2026-04-15 补充：macOS 全屏场景置顶
- 问题：macOS 置顶贴纸虽然提升到了普通 floating level，但没有加入全屏辅助 space，因此当前台应用进入全屏后，贴纸不会出现在该 fullscreen space 之上。
- 修复：
  - `src-tauri/src/platform/macos.rs`
  - 为置顶贴纸单独应用 `CanJoinAllSpaces | FullScreenAuxiliary | Stationary | IgnoresCycle` 的 collection behavior。
  - 保持 `orderFrontRegardless + floating level`，让置顶贴纸在不抢焦点的前提下进入全屏空间前台。
- 结果：
  - macOS 上显式设为“置顶”的贴纸，预期可覆盖普通全屏窗口场景。
  - 桌面层 / 壁纸层贴纸继续维持原有桌面语义，不会被一起提升到全屏辅助层。

## Backend Changes
文件：`src-tauri/src/lib.rs`

### 1) Overlay state apply
- `apply_overlay_input_state` 改为同步“全局操作态”：
  - 开启时，所有贴纸取消 click-through，并临时提升到顶层；
  - 关闭时，再按每张贴纸自己的层级配置恢复。

### 2) Layer helper
- `apply_note_window_layer_with_interaction_by_label(...)`：
  - 全局操作开启：无论原始配置如何，统一临时拉到顶层。
  - 全局操作关闭：
    - `is_wallpaper == true`：强制走壁纸层（WorkerW 背后）。
    - `is_always_on_top == true`：置顶 + 脱离桌面层。
    - `is_always_on_top == false`：桌面层（图标上层）。

### 3) Global state getter
- 新增 `get_overlay_interaction_disabled(...)`，统一读取当前全局操作开关状态。

### 4) Layer sync/toggle integration
- `apply_note_window_layer`、`sync_all_note_window_layers`、`toggle_z_order_and_apply` 增加 `isWallpaper` 分支。
- 运行时广播事件统一收敛为 `global_control_changed`，前端不再使用旧的 `overlay_input_changed` 语义。

## Impact
- 全局开关语义从“鼠标交互 / click-through”收敛为“全局操作态”。
- 开启时所有贴纸都会临时拉到顶层，方便批量调整和编辑。
- 关闭后会精确恢复每张贴纸自己的正常层级，不会覆盖原本的置顶 / 底部 / 壁纸层配置。
- 置顶贴纸在全局操作关闭时仍可直接编辑，不需要额外切换批量交互模式。
- 当贴纸处于置顶展示态时，hover 不再打断阅读；只有显式双击进入操控态后，才会暴露编辑与拖动能力。
