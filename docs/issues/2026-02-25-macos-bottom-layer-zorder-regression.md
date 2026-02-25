# macOS 贴纸“贴底”层级回归修复（2026-02-25）

## 判定
- 类型：`Bug/回归`

## 用户反馈
- 置顶功能正常。
- 贴底时层级不对，桌面文件/文件夹被贴纸压住（期望文件在贴纸上层，接近 Plash 壁纸效果）。

## 根因
- 之前贴底方案混入了“交互开关”语义，导致底部贴纸在部分状态会被抬升，不再是严格壁纸态。
- Plash 的壁纸态是固定非交互（`ignoresMouseEvents = true`）+ `desktop` 层级 + `orderBack`，而不是“贴底可交互”混合模式。

## 修复（本次）
1. 新增严格壁纸层贴底路径（默认使用）
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/macos_windows.rs`
- `attach_to_wallpaper_layer(ptr)` 现在对齐 Plash 壁纸态：
  - 层级固定：`DesktopWindowLevel`；
  - 固定非交互：`ignoresMouseEvents = true`；
  - 维持参数：`Stationary | IgnoresCycle | FullScreenNone` + `orderBack`。

2. macOS 贴底调用切换到新路径
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- `apply_note_window_layer_with_interaction_by_label`（macOS 分支）中：
  - `isAlwaysOnTop = false` 时改为调用 `attach_to_wallpaper_layer`。

3. `pin_window_to_desktop` 同步新逻辑
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- `pin_window_to_desktop` 在 macOS 下统一走严格壁纸路径，不再受交互开关影响。

4. 移除 macOS 的 Tauri `set_always_on_top` 参与
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- macOS 层级切换仅使用原生 `NSWindow.setLevel` 路径，不再混用 Tauri `set_always_on_top`。
- 原因：Tauri 在 macOS 内部通过异步队列修改 level，和我们自定义层级存在竞态，可能把贴底窗口回写到 `Normal` 层。

5. 前后端交互策略统一
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/note/[id]/+page.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/panel/use-window-sync.js`
- 当贴纸为“贴底”时，统一强制鼠标穿透；交互开关仅对“置顶”贴纸生效，避免把贴底窗口抬成非壁纸语义。
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
- 贴底：`isAlwaysOnTop = false` => 严格壁纸层（桌面图标在上方）。
- 鼠标交互开关：仅影响置顶贴纸；贴底贴纸固定穿透。

## 回归验证
1. 任选一条已 pin 贴纸，切换“置顶/贴底”。
2. 期望：
  - 置顶时贴纸在普通窗口上方；
  - 贴底时桌面文件/文件夹显示在贴纸上方（Plash 壁纸观感）。
3. 再切换“贴纸鼠标交互 开/关”，确认：
  - 置顶贴纸交互状态随开关变化；
  - 贴底贴纸始终为穿透，不会压住桌面图标。
