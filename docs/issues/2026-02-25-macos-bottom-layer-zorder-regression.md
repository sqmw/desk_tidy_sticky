# macOS 贴纸“贴底”层级回归修复（2026-02-25）

## 判定
- 类型：`Bug/回归`

## 用户反馈
- 置顶功能正常。
- 贴底时层级不对，桌面文件/文件夹被贴纸压住（期望文件在贴纸上层，接近 Plash 壁纸效果）。

## 根因
- 之前“贴底”修复切得过严，强制底部贴纸永久穿透，导致“贴纸交互”按钮点击后在贴底状态看起来无效。
- 需要兼容 Plash 的两态模型：`壁纸态`（穿透）与 `浏览态`（可交互）。

## 修复（本次）
1. 新增壁纸层两态路径（默认使用）
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/macos_windows.rs`
- `attach_to_wallpaper_layer(ptr)` 保留严格壁纸态：
  - 层级固定：`DesktopWindowLevel`；
  - 固定非交互：`ignoresMouseEvents = true`；
  - 维持参数：`Stationary | IgnoresCycle | FullScreenNone` + `orderBack`。
- 新增 `attach_to_wallpaper_layer_with_interaction(ptr, clickThrough)`：
  - `clickThrough=true`：严格壁纸态（桌面图标在上方）；
  - `clickThrough=false`：切到 `DesktopIconWindowLevel + 1` 交互态（Plash 浏览态），允许直接点击贴纸。

2. macOS 贴底调用切换到两态路径
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- `apply_note_window_layer_with_interaction_by_label`（macOS 分支）中：
  - `isAlwaysOnTop = false` 时改为调用 `attach_to_wallpaper_layer_with_interaction`。

3. `pin_window_to_desktop` 同步新逻辑
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- `pin_window_to_desktop` 在 macOS 下根据当前交互开关选择壁纸态/交互态。

4. 移除 macOS 的 Tauri `set_always_on_top` 参与
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- macOS 层级切换仅使用原生 `NSWindow.setLevel` 路径，不再混用 Tauri `set_always_on_top`。
- 原因：Tauri 在 macOS 内部通过异步队列修改 level，和我们自定义层级存在竞态，可能把贴底窗口回写到 `Normal` 层。

5. 前后端交互策略统一
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/note/[id]/+page.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/panel/use-window-sync.js`
- 交互开关对贴底与置顶均生效。
- 贴底下：
  - 交互关（穿透）=> 壁纸态；
  - 交互开（可点击）=> 交互态（会覆盖桌面图标区域，符合 Plash 浏览态行为）。
- 已存在贴底窗口被再次打开时不再主动 `setFocus`，减少被系统激活后错误抬升风险。

6. 旧方案保留（不删除）
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/macos_windows.rs`
- 原 `attach_to_worker_w` 保留为 `legacy` 路径并加注释，便于后续回退/实验。
- 旧的“桌面图标层差值 + 交互开关”方案保留为 `attach_to_wallpaper_layer_legacy`（注释保留，默认不启用）。

7. 运行时层级诊断日志（临时）
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/macos_windows.rs`
- 在 attach/detach/topmost 关键路径打印当前窗口 level 与关键系统 level（desktop/desktopIcon/normal/floating），用于确认是否出现 level 回写。

## 行为契约（macOS）
- 置顶：`isAlwaysOnTop = true` => 浮动层。
- 贴底：`isAlwaysOnTop = false` + 交互关（穿透）=> 严格壁纸层（桌面图标在上方）。
- 交互开（可点）：对齐 Windows 语义，所有已 pin 贴纸临时进入浮动层进行交互。
- 交互关后：恢复每条贴纸自己的层级（`isAlwaysOnTop=true` 仍浮动；`isAlwaysOnTop=false` 回壁纸层）。

## 回归验证
1. 任选一条已 pin 贴纸，切换“置顶/贴底”。
2. 期望：
  - 置顶时贴纸在普通窗口上方；
  - 贴底时桌面文件/文件夹显示在贴纸上方（Plash 壁纸观感）。
3. 再切换“贴纸鼠标交互 开/关”，确认：
  - 交互开：所有已 pin 贴纸可直接交互并在前台显示；
  - 交互关：非置顶贴纸回到底部壁纸层，桌面图标在其上方。
