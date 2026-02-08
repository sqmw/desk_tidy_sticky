# 2026-02-07 置顶与桌面嵌入补全（参考 Flutter docs 落地到 Tauri）

## 目标
补齐当前 Tauri 版本中“置顶/置底(WorkerW 桌面嵌入)”的关键链路，确保：
- 状态切换后窗口层级立即生效；
- 置底窗口稳定挂到 WorkerW（贴桌面层）；
- Win+D 场景下，置底贴纸不再按普通窗口处理；
- 交互模式切换时，层级行为一致。

## 参考来源
基于旧项目 docs 的行为约束实现（不复用 Flutter 代码），重点参考：
- `2026-01-31-sticky-enable-no-response.md`
- `2026-01-31-note-window-actions-not-refreshing-self.md`
- `2026-01-30-zorder-toggle-noactivate.md`
- `2026-01-31-per-note-windows.md`

## 代码改动

### 1) WorkerW 查找与层级基础能力增强
- 文件：`src-tauri/src/windows.rs`
- 改动：
  - WorkerW 初始化改为更稳健策略：
    - 对 Progman 连续发送 `0x052C`（`lParam=0/1`）；
    - 枚举 `SHELLDLL_DefView` 主窗口时，优先取“后继 WorkerW”；
    - fallback 到当前 WorkerW 或首个 WorkerW。
  - 新增 `set_topmost_no_activate`：使用 Win32 `SetWindowPos + SWP_NOACTIVATE`，避免切层级时抢焦点。

### 2) 后端统一“状态 -> 真实窗口层级”
- 文件：`src-tauri/src/lib.rs`
- 新增命令：
  - `apply_note_window_layer(window, is_always_on_top)`
  - `sync_all_note_window_layers(app)`
  - `toggle_z_order_and_apply(app, id, sort_mode)`
- 新增内部能力：
  - `apply_note_window_layer_by_label(...)`：按窗口 label 直接应用层级。
- 行为统一：
  - 置顶：`detach WorkerW -> topmost(noactivate)`
  - 置底：`notopmost(noactivate) -> attach WorkerW`
- 交互模式切换（overlay input）增强：
  - 进入交互（非穿透）时：全部 note 窗口临时 topmost（便于编辑）；
  - 退出交互（穿透）时：按每条 note 的 `is_always_on_top` 恢复真实层级。

### 3) 前端命令链路对齐
- 文件：`src/lib/panel/use-note-commands.js`
- 改动：
  - `toggle_z_order` 调整为调用 `toggle_z_order_and_apply`。
  - 每次 `loadNotes()` 后增加 `sync_all_note_window_layers`，避免窗口已存在但层级状态漂移。

### 4) note 子窗口自恢复增强
- 文件：`src/routes/note/[id]/+page.svelte`
- 改动：
  - 不再分别手工 pin/unpin；统一调用 `apply_note_window_layer`。
  - 启动后增加多次延迟重试应用层级（0/150/400ms），提高创建早期稳定性。
  - 切换置顶改为 `toggle_z_order_and_apply`，本窗口立即同步。

## 验证
- `cargo check` 通过。
- `npm run build` 通过。

## 手动回归建议
1. 创建两条 pinned 便签：A 设为置顶，B 设为置底。
2. 确认同屏混合正常（A 在前层，B 贴桌面层）。
3. 按 `Win + D`：
   - B（置底）应保持桌面嵌入层行为；
   - 切回桌面后层级不丢失。
4. 切换“鼠标交互”开关：
   - 开启交互时便签可操作并浮到前层；
   - 关闭交互后恢复各自置顶/置底规则。
5. 在主面板反复切换“置顶/置底”，确认窗口自身立即更新，无需手动刷新。

## 说明
本次只补“置顶/桌面嵌入”主链路，不引入额外架构变更（例如窗口位置持久化事件总线重写），以保证风险可控。
## 2026-02-07 附加修复：主窗口列表右侧按钮点击无响应

### 现象
- 主窗口贴纸列表中，每条贴纸右侧操作按钮（编辑/Pin/完成/归档/删除等）点击无反应。

### 原因
- 列表项外层使用 `Dismissible`（基于 pointer 手势）并在 `pointerdown` 时设置了 pointer capture。
- 按钮区点击事件被父级手势层抢占，导致按钮自身 `onclick` 无法稳定触发。

### 修复
- 文件：`src/lib/components/panel/NotesSection.svelte`
- 在 `.note-actions` 容器上增加：
  - `onpointerdown={(e) => e.stopPropagation()}`
  - `onpointerup={(e) => e.stopPropagation()}`
- 目的：按钮区域不再向上触发滑动手势捕获，恢复正常点击行为。

### 验证
- `npm run build` 通过。
- 手动预期：右侧各操作按钮点击应立即触发对应动作。
## 2026-02-07 附加修复：贴纸窗口工具栏补全 + WorkerW 挂载说明

### 修复内容
- 文件：`src/routes/note/[id]/+page.svelte`
- 恢复并补全贴纸窗口按钮：
  - 置顶/置底切换
  - 鼠标交互切换
  - 完成/取消完成
  - 归档
  - 取消钉住
  - 移入回收站
  - 关闭
- 按钮操作后会立即同步当前贴纸状态；若操作导致取消钉住，会自动关闭该贴纸窗口。

### WorkerW 何时生效
- 仅当“鼠标穿透开启（不可交互）”时，会按每条 note 的状态恢复到真实层级：
  - 置底：挂到 WorkerW
  - 置顶：前景 topmost
- 当“鼠标交互开启（可编辑）”时，会临时拉到前景层，方便编辑文本。

### 验证
- `npm run build` 通过。
