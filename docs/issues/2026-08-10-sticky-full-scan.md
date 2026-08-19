# 2026-08-10 贴纸链路全量问题扫描

状态：scan done；**P0 批次（A1/A2/A3/A4 + A5/C1）已于 2026-08-10 修复**，见第 8 节；其余条目仍为待处理台账。

方法：按 `docs/README.md` 索引路由后定向通读贴纸链路全部源码——Rust 侧 `src-tauri/src/desktop/sticky/*`（auto_hide 753 行 / mod 322 行 / layer / effects / display_recovery / panel_window）、`notes/service.rs` 与 `notes/commands.rs` 的贴纸相关分支、`desktop/shortcuts.rs`；前端侧 `src/routes/note/[id]/+page.svelte`（1767 行）、`src/lib/components/note/*`、`src/lib/note/*`、`src/lib/panel/use-window-sync.js`、`src/lib/markdown/blocks/block-parser.js`。全部发现带文件与行号锚点，并逐条标注判定类型。

与 `docs/ui/2026-07-27-sticky-window-audit.md` 的关系：该文档是**视觉/交互层**审计，本文档是**数据正确性、窗口生命周期与资源**扫描。两者重叠部分在第 6 节统一对账，不重复展开。

判定口径：`Bug` = 与现有设计意图矛盾；`回归` = 曾经正确、被后续改动破坏；`设计行为` = 当前是有意取舍但存在代价；`证据不足` = 需实机复现才能定性。

---

## 1. 高危速览

| ID | 严重度 | 判定 | 状态 | 一句话 |
| --- | --- | --- | --- | --- |
| A1 | High | Bug | **已修复** | 控制态下由面板关闭贴纸，后端按扩展后的原生窗口尺寸持久化，贴纸每轮变大且不可逆 |
| A2 | High | Bug | **已修复** | 已隐藏贴纸被拖动后再次触发溢边隐藏，"可见坐标"被隐藏坐标覆盖，唤回后回不到原位 |
| A3 | High | Bug | **已修复** | 隐藏状态下点"置底 / 壁纸层"，运行态字段被清空但 `x/y` 仍是屏幕外坐标，贴纸永久消失且快捷键唤不回 |
| A4 | High | Bug | **已修复** | 块编辑器 3 条写入路径不检查保存返回值，保存失败时编辑内容静默丢失 |
| B1 | Med-High | Bug | 待处理 | 混合 DPI 多显示器下窗口矩形与显示器矩形用不同 scale 归一，隐藏/归位坐标失真 |
| B2 | Med-High | Bug | 待处理 | macOS 关闭贴纸只 `order_out`，webview 与 900ms 轮询定时器继续存活 |
| C1 | Med | Bug | **已修复** | 图片粘贴直写 `activeBlockDraft`，绕过内联色区间重算，彩色块粘图后颜色错位 |
| E1 | Med | 设计行为 | 待处理 | 每张贴纸常驻 900ms 轮询，每 tick 2 次 IPC；N 张贴纸线性放大 |
| D1 | Med | 未闭环 | 待处理 | 零暗色支持（全仓库 `prefers-color-scheme` 命中 0），`--ws-*` 在贴纸内 31 处引用全部走 fallback |
| F1 | Med | 债务恶化 | 待处理 | 两个巨型文件从 2528 行涨到 3226 行；`note-editor-actions.js` 163 行仍无人 import |

---

## 2. A 类：数据与状态正确性（最高优先）

### A1（High，Bug）控制态下的窗口尺寸被错误持久化

- 锚点：`src-tauri/src/notes/commands.rs:152-176`、`src/routes/note/[id]/+page.svelte:417-441`、`src/lib/panel/use-window-sync.js:73-96`
- 现象：贴纸处于控制态（工具栏外置、原生窗口向四周扩出透明预留）时，从面板/工作台关闭桌面贴纸，贴纸尺寸被写大；反复开关持续累积。
- 根因：前端 `getPersistableWindowSize()` 正确地从原生尺寸里减去 `appliedLeft/Right/Top/ToolbarReserve` 再持久化；但后端 `persist_note_window_size` 直接取 `window.inner_size()`，完全不知道预留的存在。而 `closeNoteWindowByLabel` 走的正是后端这条路径。
- 放大条件：macOS 上 `dismiss_note_window_by_label` 只做 `order_out`（见 B2），webview 不销毁，前端 `onMount` 清理里的 `persistWindowSize({force:true})` 根本不会执行，后端的错误值成为唯一写入。
- 影响：尺寸单调增长，用户无法通过任何 UI 复原；`update_note_size` 只有 220px 下限没有上限。
- 建议：预留量是前端唯一真相，后端不应独立测量。改为关闭前由前端上报正文矩形，或把预留量作为窗口状态存入 Rust 侧后在 `persist_note_window_size` 中扣除。

### A2（High，Bug）重复隐藏覆盖"可见坐标"锚点

- 锚点：`src-tauri/src/desktop/sticky/auto_hide.rs:349-402`（尤其 386-394）、`src/routes/note/[id]/+page.svelte:650-671,1018-1044`
- 现象：把已隐藏的贴纸从屏幕边缘的可见细边拖一下，之后唤回，贴纸贴到显示器边缘而不是隐藏前的位置。
- 根因：`hide_note_to_edge_unlocked` 没有任何"当前已是 hidden"的前置判断。拖动结束后 `onPositionPersist` → `hideToEdgeAfterOverflowIfNeeded`，该函数只挡 `isEditing / isControlMode / !autoHideEnabled`，不挡 `autoHideState === "hidden"`。此时 `geometry.body` 已是屏幕外坐标，却被当作"可见位置"写进 `auto_hide_visible_x/y`（`update_note_auto_hide_state` 的第 5 个参数）。唤回时 `visible_position` 把这个屏幕外坐标 clamp 到显示器边界。
- 可触发性：`.edge-reveal-handle` 只覆盖边缘的 `min(72px, 42%)`，剩余细边属于 `.note-block-surface`，是可拖区域；`NOTE_WINDOW_NON_DRAGGABLE_SELECTOR` 只排除 `button`，不排除细边本身。
- 建议：`hide_note_to_edge_unlocked` 开头加 `if note.auto_hide_state == hidden { return Ok(None) }`；同时前端 `hideToEdgeAfterOverflowIfNeeded` 增加同一守卫（双保险，因为后端是唯一坐标真相）。

### A3（High，Bug）隐藏态下切换层级导致贴纸永久失踪

- 锚点：`src-tauri/src/notes/service.rs:86-93`（`clear_auto_hide_runtime`）、`:442-451`（`toggle_z_order`）、`:453-461`（`toggle_wallpaper_layer`）、`:318-329`（`hidden_notes`）
- 现象：贴纸处于隐藏状态时，在工作台卡片上点"置底"或"壁纸层"，贴纸从此看不见，`Ctrl+Shift+H` 也唤不回。
- 根因链：
  1. `toggle_z_order` 关闭置顶时调用 `clear_auto_hide_runtime`，清掉 `auto_hide_state / edge / visible_x / visible_y / hidden_x / hidden_y`；
  2. 但 `n.x / n.y` 保持不动——它们在隐藏时已被 `update_note_auto_hide_state:273-274` 写成屏幕外的隐藏坐标；
  3. `hidden_notes()` 要求 `is_always_on_top`，此刻已为 false，快捷键的 reveal 分支扫不到它；
  4. `normalize_note_window_position_unlocked:487-489` 在 `!auto_hide_enabled && auto_hide_state.is_none()` 时直接 return，归位兜底也不生效。
- 同类路径：`toggle_wallpaper_layer` 转壁纸层时同样清运行态；`toggle_pin / toggle_archive / delete_note` 会额外把 `auto_hide_enabled` 置 false，同样留下屏幕外的 `x/y`。
- 影响：用户视角是数据丢失（贴纸没了）。现有的 `docs/issues/2026-04-28-recover-offscreen-pinned-stickies.md` 恢复入口不覆盖这条路径。
- 建议：`clear_auto_hide_runtime` 在清空前，若 `auto_hide_state == hidden` 且存在 `auto_hide_visible_x/y`，先把 `n.x/n.y` 回写为可见坐标；无可见坐标时回落到显示器工作区内的安全位置。这是纯后端单点修复。

### A4（High，Bug）块编辑器三条写入路径吞掉保存失败

- 锚点：`src/lib/components/note/BlockNoteContent.svelte:231`（`splitActiveBlockAfter`）、`:268`（`addSameBlockAfterActive`）、`:327`（`mergeActiveBlockBackward`）
- 现象：存储进入 `recovery_required` 或写盘失败时，回车分块、追加同类块、Backspace 合并块这三个操作的内容直接消失，无任何提示。
- 根因：三处都是裸 `await onTextChange(...)`，不检查返回值。对照 `commitActiveBlock:196-200` 和 `commitEmptyEditor:439-443` 都正确地判断了 `saved === false` 并触发 `onConflict()`。且三处在 await 之前就已把 `activeBlockDraft` 清空、`activeBlockOriginal` 置 null，失败后无草稿可回滚。
- 附带：失败时 `pendingActiveStartLine` 指向一个不存在的行，`$effect:88-102` 会静默丢弃 pending 状态，光标位置也一并丢失。
- 建议：三处统一改为先判 `saved === false` → 恢复 `activeBlockId / activeBlockOriginal / activeBlockDraft` 并 `onConflict()`，再清状态。这也是恢复态（recovery_required）下唯一还能静默丢数据的入口。

### A5（Low，Bug）`activeBlockInitialDraft` 三处未重置

- 锚点：`BlockNoteContent.svelte:260-263,318-321,455-459`
- 现状：`commitActiveBlock:205` 会清，另外三处（addSameBlock / merge / cancel）不清。当前因 `hasUnsavedDraft():484` 先判 `!activeBlockOriginal` 返回 false 而无外部可见影响，属于潜伏不一致。
- 建议：并入 A4 的统一清理函数。

---

## 3. B 类：窗口几何与生命周期

### B1（Med-High，Bug）混合 DPI 下坐标空间不一致

- 锚点：`src-tauri/src/desktop/sticky/auto_hide.rs:99-114`（`window_rect`）与 `:136-160`（`monitor_rects`）
- 根因：`window_rect` 用**窗口自身**的 `scale_factor` 把物理坐标除成逻辑坐标；`monitor_rects` 用**每个显示器各自**的 `scale_factor` 归一各自的 work area。两者产出的不是同一个坐标系。在 Windows 的全局虚拟桌面物理坐标空间里，副屏 125% + 主屏 100% 时，副屏的 work area 原点被错误缩小 1.25 倍。
- 影响：`resolve_window_monitor` 可能选错显示器；`hidden_position` / `visible_position` 的 clamp 边界失真；隐藏细边宽度不再是 8px。
- 判定说明：单显示器或全屏同缩放环境不可见，因此现有 21 项 Rust 测试全部通过（测试用的都是无 DPI 概念的纯 f64 矩形）。
- 建议：整条链路统一在**物理坐标**下计算，只在最后调用 `move_note_window_without_activation` 时转一次；或统一除以主显示器 scale。需要补一条混合 DPI 的纯函数测试。

### B2（Med-High，Bug）macOS 关闭贴纸不销毁 webview

- 锚点：`src-tauri/src/desktop/sticky/panel_window.rs:54-76`、`src/lib/panel/use-window-sync.js:251-263`、`src/routes/note/[id]/+page.svelte:479-484,1272,1325-1341`
- 现象：macOS 上关闭桌面贴纸后，进程 CPU 与 IPC 流量不归零。
- 根因：`dismiss_note_window_by_label` 在 macOS 分支只做 `panel.order_out(None)`，在其他平台是 `window.close()`。order_out 不触发 Svelte 组件销毁，`onMount` 返回的清理函数不执行，于是 `startWindowSizePoll()` 的 900ms `setInterval`、`notes_changed` / `global_control_changed` 监听、`ResizeObserver` 全部继续存活。
- 影响：N 张"已关闭"的贴纸 = N × 2.2 次 IPC/秒 + N 份事件监听；且这些幽灵窗口仍会响应 `notes_changed` 去做 `applyZOrderAndParent()`。
- 判定补充：order_out 是 NSPanel 的合理做法（避免重建成本），问题在于**前端没有对应的暂停机制**。
- 建议：二选一——(a) macOS 也走 close；(b) 保留 order_out，但监听窗口可见性，在不可见时停轮询、停监听。

### B3（Med，Bug）窗口创建卡死会永久污染 `creatingLabels`

- 锚点：`src/lib/panel/use-window-sync.js:183-243`
- 根因：`creatingPromise` 只在 `tauri://created` 或 `tauri://error` 里 resolve。两个事件都没来（创建过程卡住）时，promise 永不 resolve，`creatingLabels` 里的条目永不删除，后续每次 `syncWindows` 命中 `if (creating) await creating` 直接挂起，整个同步循环失效。
- 对照：同文件的 `waitForNoteWindowReady:112-140` 就有 900ms 超时兜底，创建路径没有。
- 建议：给 `creatingPromise` 加超时 + `finally` 清理。

### B4（Med，Bug）打开贴纸逐个抢焦点

- 锚点：`src/lib/panel/use-window-sync.js:166-169`
- 现象：应用启动或重新打开贴纸时，每张置顶贴纸依次 `setFocus()`，抢走用户当前应用的焦点，N 张就抢 N 次。
- 附带：处于自动隐藏状态的贴纸也会被 `setFocus()`，焦点落到一个屏幕外窗口。
- 建议：批量恢复时不 setFocus；只在用户显式新建/打开单张贴纸时聚焦，且隐藏态贴纸一律跳过。

### B5（Med，Bug）非隐藏态归位每次都写盘

- 锚点：`src-tauri/src/desktop/sticky/auto_hide.rs:491-517`
- 根因：hidden 分支有 `stored_position_matches` 守卫（`:470-478`），避免无变化时写盘；visible 分支没有，无条件执行 `normalize_note_auto_hide_position`，即使 `moved == false`。
- 影响：每次窗口 ready / 每次显示器事件都产生一次 `notes.json` 全量读改写（`mutate_note` 走的是完整 load-modify-persist）。
- 建议：对齐 hidden 分支，加同样的坐标匹配守卫。

### B6（Med，Bug）弹层无翻转，会被原生窗口裁切

- 锚点：`src/lib/components/note/NoteToolbar.svelte:431-434,454-466`、`src/routes/note/[id]/+page.svelte:1561-1567`
- 说明：07-27 审计的 B2（popover 锚定失效）已修复，`.tool-popover-anchor` 现在是 `position: relative`。新问题是所有弹层固定 `bottom: calc(100% + 8px)` 向上展开，而控制态的原生窗口高度 = 正文高度 + 上下预留，是**按内容精确计算**的。贴纸较矮时，112px 的调色板会超出原生窗口顶边被硬裁。
- 建议：弹层高度纳入 `getExpandedNoteWindowFrame` 的预留计算，或加向下翻转。

### B7（Low，Bug）显示器恢复线程可并发

- 锚点：`src-tauri/src/desktop/sticky/display_recovery.rs:39-51,72-87`
- 根因：`settle` 返回 `Ready` 时先从 map 里删除 key 再退出循环，随后**在锁外**执行 `recover_hidden_note_window_position`。这段窗口期内新到的移动事件会看到 `!contains_key` → `should_spawn = true` → 再起一个线程。同一 note 可能有两个恢复线程并发。
- 影响：实际被 `with_notes_store` 串行化，最坏是重复一次归位，不产生数据损坏。
- 建议：把删除 key 推迟到恢复完成之后，或加 per-note 执行锁。

### B8（Low，Bug）label 前缀剥离用了 `trim_start_matches`

- 锚点：`src-tauri/src/desktop/sticky/mod.rs:119`、`src-tauri/src/desktop/sticky/layer.rs:23`
- 说明：`trim_start_matches("note-")` 会**重复**剥离前缀，note id 若以 `note-` 开头就会被削掉。`display_recovery.rs:56` 和 `use-window-sync.js:66-70` 用的是正确的 `strip_prefix` / `startsWith + slice`。三处实现不一致。
- 建议：统一为 `strip_prefix`。

---

## 4. C 类：编辑器与内容

### C1（Med，Bug）图片粘贴绕过内联色区间重算

- 锚点：`src/lib/components/note/BlockNoteContent.svelte:750-781`（尤其 768-772）
- 根因：粘贴分支直接赋值 `activeBlockDraft = inserted.text`，没有走 `setEditorDraft()`（`:559-569`），因此 `editorController.updateInlineRanges()` 不执行。`activeInlineColorRanges` 里的 start/end 仍是插入前的偏移。
- 影响：在设置过文字颜色的块里粘贴图片，提交时 `serializeMarkdownInlineStylesFromEditing` 会把颜色标记套到错误的字符范围上，产生错位的彩色片段。
- 建议：改用 `setEditorDraft(inserted.text)`。一行修复。

### C2（Med，未闭环）`hr` 块在编辑器内既不能编辑也不能删除

- 锚点：`src/lib/markdown/blocks/block-parser.js:39`（`editable: type !== "hr"`）、`BlockNoteContent.svelte:334-345,865-880,1117`
- 说明：07-27 审计 C13 原样保留。`hr` 不渲染编辑按钮，`getPreviousEditableBlock` 遇到它返回 null，Backspace 跨块合并被挡住，分隔线一旦写入就只能通过外部编辑器删除。

### C3（Med，性能）块 id 含行号与哈希，导致 keyed 列表整体重建

- 锚点：`src/lib/markdown/blocks/block-parser.js:33`（`id = type:startLine:endLine:hash`）、`BlockNoteContent.svelte:1052`
- 说明：任何一次提交只要改变行数，后续所有块的 `startLine` 变化 → id 变化 → `{#each ... (block.id)}` 销毁重建其后全部 DOM。长笔记里表现为图片重新加载、滚动锚点丢失、可感知卡顿。
- 建议：id 改为内容稳定的标识（例如仅哈希 + 同哈希序号），或改用非 keyed 加显式 diff。

### C4（Low，Bug）编辑器失焦提交不处理冲突

- 锚点：`BlockNoteContent.svelte:783-792`
- 说明：`handleEditorBlur` 裸 `await commitActiveBlock()`。冲突时 `onConflict()` 触发但块已失焦，用户看到冲突提示却不知道自己的编辑还在不在。

### C5（Low，未闭环）`.task-add` 的 aria 仍硬编码英文

- 锚点：`src/lib/markdown/renderer.js:313`（`aria-label="Add todo"`）
- 说明：07-27 审计 C9 的 i18n 部分未闭环，其余 note 组件已全部走 `strings`（本轮 grep 未发现其他硬编码）。

---

## 5. D/E/F 类：视觉、性能、架构

### D1（Med，未闭环）零暗色 + `--ws-*` 在贴纸内全部失效

- 证据（本轮复核）：全仓库 `prefers-color-scheme` 命中 **0** 次；`--ws-*` 只在 `src/routes/workspace/+page.svelte`（31 处定义）与 `WorkspaceSettingsDialog.svelte`（21 处定义，双真源且数值已分叉）中定义，而贴纸侧有 31 处 `var(--ws-*)` 消费（`BlockNoteContent.svelte` 11、`NoteTagsEditor.svelte` 18、`NoteTagBar.svelte` 2），全部落在 fallback 上。
- 硬编码浅色点（新增确认）：`+page.svelte:1550-1559`（`.loading` #8a94a6）、`:1719-1744`（冲突提示 #fff7ed / #7c2d12 / #9a3412）、`:1746-1765`（HUD rgba(15,23,42,.72)）、`NoteToolbar.svelte:454-466`（弹层 rgba(255,255,255,.96)）。
- 对应 07-27 审计 A1 / A3，属于 S1 阶段既定范围，本轮只做证据更新。

### D2（Low，未闭环）块的可编辑性靠 `cursor: grab` 表达

- 锚点：`BlockNoteContent.svelte:1165-1167`、`+page.svelte:1538-1548`、`:1698-1707`
- 说明：`.note-block-surface` 是 `cursor: text`，但更具体的 `.note-block.rendered:not(.readonly)` 覆盖为 `grab`。渲染态块的鼠标反馈指向"可拖窗口"，而它的实际单击行为是"进入编辑"。两个语义冲突，07-27 审计 C1 的可供性问题换了形式仍在。

### D3（Low，未闭环）块间距仍为 0

- 锚点：`BlockNoteContent.svelte:1142`（`gap: 0`）。对应审计 C4，是第一轮纠偏后的有意取舍（保正文坐标不变），此处仅记录代价。

### E1（Med，设计行为）常驻轮询与 IPC 放大

- 锚点：`+page.svelte:151`（`WINDOW_SIZE_POLL_MS = 900`）、`:479-484`、`:417-441`
- 说明：每张贴纸每 900ms 调一次 `persistWindowSize()`，其中 `getPersistableWindowSize()` 无条件发起 `innerSize()` + `scaleFactor()` 两次 IPC——早退守卫在这两次 IPC**之后**才生效。10 张贴纸 ≈ 22 次 IPC/秒。叠加 B2 后，"已关闭"的贴纸同样在跑。
- 建议：早退守卫前移；或把轮询改为仅在 `onResized` 之后的一次性收敛。

### E2（Low，性能）单条查询做全量加载

- 锚点：`src-tauri/src/desktop/sticky/mod.rs:124-143`（`sync_note_layer_by_id`）、`src-tauri/src/desktop/sticky/effects.rs:109-120`（`sync_note_window_frost_by_id`）
- 说明：为读一张贴纸的层级/磨砂值，各自 `load_notes` 全量读盘 + 排序。`apply_note_window_layer` 命令一次调用触发两遍。已有 `notes_service::find_note` 可用。

### E3（Low，健壮性）主线程无界循环与 panic 点

- `src-tauri/src/desktop/sticky/effects.rs:41`：`while matches!(clear_vibrancy(&effect_window), Ok(true)) {}` 在主线程上无上界循环，依赖 `clear_vibrancy` 最终返回 `Ok(false)`。建议加迭代上限。
- `src-tauri/src/runtime/state.rs:8`：`GlobalControlState::toggle` 用 `.expect("global control mutex poisoned")`，在全局快捷键回调里 panic 会直接影响事件循环。同文件其他 State 都用 `map_err`。

### F1（Med，债务恶化）巨型文件与死代码

- `src/routes/note/[id]/+page.svelte` **1767 行**（审计时 1288）、`src/lib/components/note/BlockNoteContent.svelte` **1459 行**（审计时 1240），合计从 2528 涨到 **3226 行**。审计 D1 的问题被本轮改动放大而非收敛。
- `src/lib/note/note-editor-actions.js` **163 行，全仓库 0 个 import**（本轮 grep 复核，唯一导出 `createNoteEditorActions` 零引用）——审计 D2 的核心死代码仍在。
- `src/lib/note/note-window-drag.js:175` 的 `.preview-text` 指向不存在的类；`BlockNoteContent.svelte:33,1009` 的 `compact` prop 无对应 CSS，仍是空 API；`--note-inner-highlight-alpha` 在 `+page.svelte:100,1456` 注入、**零消费**。
- `src-tauri/src/desktop/sticky/layer.rs:119-134`：`resolve_note_ignore_cursor` 的 `if is_wallpaper { return true } true` 两个分支返回同值，`is_wallpaper` 判断是死分支。

### F2（Med，架构）两套窗口拖拽实现的选择器清单持续漂移

- 锚点：`src/lib/note/note-window-drag.js:1-17` vs `src/lib/workspace/window-drag.js:2`
- 说明：workspace 版支持 `[data-no-drag="true"]`，贴纸版不支持（审计 B4 的根因未消除，只是当前贴纸组件恰好没用该属性）。本轮 grep 确认 `data-no-drag` 有 8 处使用，全部在 workspace / break-overlay 侧。这是一个静默陷阱：任何人在贴纸组件里写 `data-no-drag` 都不会生效。

### F3（Low，一致性）`notes_changed` 事件存在两种载荷形状

- 锚点：`src-tauri/src/desktop/sticky/mod.rs:37-39`（`emit("notes_changed", ())`）vs `auto_hide.rs:67-76`（`emit("notes_changed", StickyMetadataChangedEvent)`）
- 说明：同一事件名一处发空载荷、一处发结构体。消费端 `+page.svelte:1286-1298` 靠 `typeof payload?.kind === "string" ? ... : "full"` 兜底。可用但脆弱，新增发射点很容易漏掉字段约定。

### F4（Low，待确认）release 构建启用 devtools

- 锚点：`src-tauri/Cargo.toml:24`（tauri features 含 `"devtools"`）、`src/lib/panel/use-window-sync.js:204`（每张贴纸 `devtools: true`）
- 判定：**证据不足**。`docs/issues/2026-04-16-release-webview-devtools-context-menu.md` 表明这可能是有意保留的排障能力。需要确认发布策略：若非有意，应改为 `#[cfg(debug_assertions)]` 条件启用。

---

## 6. 与 2026-07-27 审计的对账

已闭环（本轮复核确认）：

- A9 工具栏 `type="button"`：13 个按钮 13 个都有。
- B2 popover 锚定：`.tool-popover-anchor` 已改 `position: relative`（遗留 B6 裁切问题）。
- B3 渲染态可选中：`.note-block-surface` 现为 `user-select: text`。
- C7 图片粘贴：已通过 `note-clipboard-image.js` 接线（但引入了 C1）。
- 其余 i18n：除 `renderer.js:313` 外，note 组件已无硬编码英文。

仍未闭环（证据已在上文更新）：A1 / A3（→ D1）、A4 字体栈、C1（→ D2）、C4（→ D3）、C13（→ C2）、D1（→ F1，已恶化）、D2（→ F1）、D4（→ F2）。

---

## 7. 建议整改批次

按"数据不可逆损失 → 资源与几何 → 内容正确性 → 债务"排序，每批可独立提交与验证：

1. **P0 数据安全**（A1 / A2 / A3 / A4）。四条都会造成用户可感知的不可逆损失，且修复面都很小：A1 改一处后端尺寸来源，A2 加一个后端守卫，A3 在 `clear_auto_hide_runtime` 里补一次坐标回写，A4 统一三处保存返回值检查。验收需要补 Rust 纯函数测试（隐藏态清运行态后的坐标、重复隐藏幂等）与前端保存失败回滚测试。
2. **P1 生命周期与几何**（B1 / B2 / B3 / B5 / E1）。B1 需要先定坐标空间口径再动代码，建议单独讨论；B2 需要在"macOS 也 close"与"暂停前端定时器"之间做产品取舍。
3. **P2 内容正确性**（C1 / C2 / C4 / C3）。C1 是一行修复，可以并入 P0 一起提交。
4. **P3 债务与视觉**（D1 / F1 / F2 / F3 / E2 / E3）。D1 归属既有的 S1 共享 token 阶段；F1 巨型文件拆分归属 S6，需要单独立项。

阻塞与前置：P0 的 A1 与 B2 在 macOS 上耦合（A1 的现象由 B2 放大），建议同一轮处理并在 macOS 实机验证一次"控制态 → 关闭贴纸 → 重开"的尺寸守恒。

---

## 8. 2026-08-10 P0 批次修复记录

任务：`T-STK-P0-DATA-SAFETY`（[TODO](../TODO.md#todo-t-stk-p0-data-safety)）。范围为 A1/A2/A3/A4 加同函数的 A5/C1，其余条目未动。

### A1 控制态尺寸

预留量改为前端独占真相，后端不再自己测量：

- 新增 `StickyWindowReserveState`（`src-tauri/src/runtime/state.rs`），按 note id 保存控制态四周透明预留的水平/垂直合计；上报 `0,0` 即删除条目，非有限值与负值一律按 0 处理。
- 新增命令 `set_note_window_reserve`（`src-tauri/src/desktop/sticky/mod.rs`）。
- `persist_note_window_size`（`src-tauri/src/notes/commands.rs`）经新的纯函数 `note_body_extent` 扣除预留后再写盘；未上报的窗口按无预留处理，因此漏报只会退回旧行为，不会把贴纸改小。
- 前端抽出 `getAppliedControlsReserve()` 作为唯一算式，`getPersistableWindowSize()` 与新的 `reportControlsReserveToBackend()` 共用；一个 `$effect` 在预留量变化时上报，挂载时以 `0,0` 触发一次，顺带清掉上一个"展开着被关闭"的窗口留下的条目。

**残留（已知、未修）**：上报与原生窗口尺寸变化不是原子的。收起动画期间存在约 1ms 的窗口，此时 `toolbarWindowExpanded` 已为 false 而原生窗口尚未缩小，若 `persist_note_window_size` 恰好落在这一刻仍会存下扩展尺寸。触发它需要用户在两个窗口里同时操作，且后果是一次性偏差而非原来的单调累积，故本轮不引入更复杂的同步。

### A2 隐藏幂等

- `hide_note_to_edge_unlocked` 增加 `is_already_hidden` 守卫，隐藏对已隐藏贴纸成为空操作。
- 前端 `hideToEdgeAfterOverflowIfNeeded` 同步加同一守卫，省掉一次往返（后端仍是唯一判据）。

### A3 隐藏态切层级

双保险：

- 存储层：`clear_auto_hide_runtime`（`src-tauri/src/notes/service.rs`）在清运行态字段前，若当前为 hidden 则把 `x/y` 回收为 `auto_hide_visible_x/y`；没有可见锚点时置 `None`，让窗口回落到系统默认位置而不是已知的屏幕外坐标。这一条覆盖 `toggle_pin` / `toggle_archive` / `delete_note` / `restore_note` 等所有清理路径。
- 命令层：`toggle_z_order_and_apply`、`toggle_wallpaper_layer_and_apply`、`set_note_auto_hide_enabled(false)` 三条仍保留活窗口的路径，在改状态前先调 `reveal_hidden_note_before_state_change` 把窗口移回来。唤回失败只打日志，不阻断切换——存储层回收仍然生效。

### A4 / A5 块编辑器写入路径

- 新增无依赖纯函数模块 `src/lib/note/block-structural-commit.js`，其 `applyStructuralTextChange` 承载"保存被拒 → 清 pending 光标 → 还原编辑会话 → 报冲突"的判定。放在独立模块是因为 `block-note-editor-controller.js` 依赖 `$lib` 别名，`node --test` 无法直接加载。
- `BlockNoteContent.svelte` 抽出 `clearActiveBlockState / captureEditingSession / restoreEditingSession`，分块、追加同类块、Backspace 合并三处改为先快照后清理，失败即回滚草稿。`activeBlockInitialDraft` 随统一清理函数一并补齐（A5）。
- `mergeActiveBlockBackward` 无论保存成败都返回 `true`，因为 Backspace 已被 `preventDefault`，不能回落到浏览器默认删除。

### C1 图片粘贴

`handleEditorPaste` 改走 `setEditorDraft(inserted.text)`，内联色区间随插入偏移重算；同时用 `getEditorDraft()` 取草稿，与下方的选区读取保持同一来源。

### 验证

`make check`（svelte-check 0 error / 0 warning，`cargo check` 通过）、`make test`、`git diff --check` 全绿。Rust 测试 24 → **31**（新增 3 条 `clear_auto_hide_runtime` 坐标回收、2 条隐藏幂等、4 条预留量扣减、3 条预留量状态机）；前端测试 15 → **18**（新增 3 条结构化写入回滚）。macOS 上执行，Windows-only 分支未参与本轮编译。

**仍需实机冒烟**（纯函数与类型检查覆盖不到）：

1. macOS/Windows：进入控制态 → 从面板关闭桌面贴纸 → 重新打开，确认正文尺寸守恒（A1 主路径）。
2. 隐藏一张贴纸 → 拖动其可见细边 → 快捷键唤回，确认回到隐藏前位置（A2）。
3. 隐藏一张贴纸 → 在工作台点"置底"或"壁纸层"，确认贴纸立即回到屏幕内而不是消失（A3 命令层）。
4. 把存储置为 `recovery_required` → 在贴纸里回车分块 / Backspace 合并，确认草稿仍在且出现冲突提示（A4）。
5. 在设过文字颜色的块里粘贴图片，确认颜色片段没有错位（C1）。
