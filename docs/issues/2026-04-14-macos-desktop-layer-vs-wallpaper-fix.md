# macOS「图标上层」未生效修复（2026-04-14）

## 判定
- 类型：`Bug/回归`

## 背景
- 用户反馈：mac 上“贴在图标上层”没有效果，视觉上始终像“贴在壁纸层”。
- 期望语义：
1. `贴到壁纸层`：在桌面图标下方。
2. `贴在图标上层`：在桌面图标上方，但不等于全局置顶窗口。

## 根因
- mac 分支层级函数 `apply_note_window_layer_with_interaction_by_label` 里，非置顶路径基本统一走了 `attach_to_wallpaper_layer_with_interaction(...)`。
- 对 `isWallpaper` 没有做真正的层级分流，导致非壁纸态在默认穿透态下也落到壁纸层。

## 修复
### 1) 新增 mac 原生 desktop-layer 接口
- 文件：`src-tauri/src/platform/macos.rs`
- 新增 `attach_to_desktop_layer_with_interaction(ptr, click_through)`：
  - level 设为 `DesktopIconWindowLevel + 1`（图标上层）
  - `ignoresMouseEvents` 跟随 `click_through`

### 2) mac 层级分支按 `isWallpaper` 显式分流
- 文件：`src-tauri/src/desktop/sticky/layer.rs`
- 新策略：
  - `isWallpaper=true`：强制走 wallpaper 层（在图标下方）
  - `isWallpaper=false` 且非 topmost：走 desktop layer（图标上方）
  - 其余保留既有 topmost 逻辑

### 3) `pin_window_to_desktop` 同步语义
- 文件：`src-tauri/src/desktop/sticky/mod.rs`
- mac 分支改为 attach 到 desktop layer，而不是 wallpaper layer。

## 验证
- `cargo check`（`src-tauri`）通过。

## 回归关注点
1. 同一贴纸切换 `isWallpaper` 前后，图标上下层差异应明显可见。
2. 非壁纸态在全局穿透开启时应保持“图标上层”。
3. 壁纸态仍保持图标下方语义，不应被误抬升到图标上方。
