# 2026-02-08 透明度调整引发全局贴纸闪动：根因与修复

## 现象
调整某一张贴纸透明度时，其他贴纸也发生闪动。

## 根因
1. 面板端 `loadNotes()` 每次都会调用 `sync_all_note_window_layers`，导致所有贴纸窗口层级被全量重刷。  
2. 透明度变更如果触发全局事件，会间接触发面板重载链路，放大全量重刷问题。

## 修复
### 1) 关闭面板中的“每次加载都全量重刷层级”
- 文件：`src/lib/panel/use-note-commands.js`
- 变更：`loadNotes()` 中移除 `sync_all_note_window_layers` 调用。  

### 2) 透明度更新保持静默，不广播全局刷新
- 文件：`src/routes/note/[id]/+page.svelte`
- 变更：透明度调节仅调用 `update_note_opacity(..., emitEvent=false)`。  
- 移除“延迟二次提交 emitEvent=true”逻辑，避免停止滚轮后再次触发全局链路。

## 结果
1. 调整单张贴纸透明度时，不再触发其他贴纸层级重排。  
2. 全局贴纸闪动显著下降，交互稳定性提升。

## 验证
1. `cargo check` 通过（无新增错误）。  
2. `npm run check` 通过（0 errors / 0 warnings）。
