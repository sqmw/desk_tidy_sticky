# 2026-02-09 workspace 窗口句柄未就绪报错修复

## 现象
切换到工作台窗口时，控制台出现：
- `apply_window_no_snap_by_label(workspace) the underlying handle is not available`

同时出现 Chromium 提示：
- `[Intervention] Images loaded lazily and replaced with placeholders...`

## 原因
1. `workspace` 窗口刚创建完成时，Win32 句柄可能尚未可用；此时立刻调用 `apply_window_no_snap_by_label` 会失败。
2. Markdown 图片标签默认 `loading="lazy"`，在某些 WebView 场景会触发该 Intervention 提示。

## 修复方案
### 1) 前端：窗口效果调用改为“就绪重试”
- 新增文件：`src/lib/panel/window-effects.js`
- 提供 `applyNoSnapWhenReady(invoke, label)`：
  - 对可恢复错误进行短延迟重试
  - 超过重试次数后仅告警，不打断主流程

### 2) 前端：切换工作台时机调整
- 文件：`src/lib/panel/switch-panel-window.js`
- 改为：
  1. 先创建/显示 `workspace`
  2. 再调用 `applyNoSnapWhenReady(...)`

### 3) 前端：便笺窗口同步复用重试策略
- 文件：`src/lib/panel/use-window-sync.js`
- 便笺窗口创建后应用 no-snap 逻辑改为复用 `applyNoSnapWhenReady`

### 4) 后端：命令级容错
- 文件：`src-tauri/src/lib.rs`
- `apply_window_no_snap_by_label` 在检测到 `underlying handle is not available` 时返回 `Ok(())`，避免把短暂时序问题升级成错误。

### 5) 图片懒加载提示处理
- 文件：`src/lib/markdown/renderer.js`
- 图片标签从 `loading="lazy"` 调整为 `loading="eager"`（并保留 `decoding="async"`），减少该提示出现。

## 验证
1. `npm run check`：通过（0 errors / 0 warnings）
2. `cargo check`：通过（仅既有 warning）
