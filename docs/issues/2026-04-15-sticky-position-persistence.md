# 贴纸位置重开不恢复修复（2026-04-15）

## 判定
- 类型：`Bug`

## 背景
- 现象：拖动贴纸到新位置后，关闭桌面贴纸或重新打开应用，贴纸没有回到上次关闭的位置。
- 预期：贴纸拖动后的坐标应持久化，下次重新打开时恢复到上次位置。

## 根因
- 数据层已经有 `x / y / width / height` 字段，也提供了 `update_note_position` 命令。
- 但前端拖动实现只调用了窗口实例的 `setPosition()`，没有把新坐标写回 note 存储。
- 重新创建贴纸窗口时，也没有把 note 中已保存的 `x / y` 传回 `WebviewWindow` 创建参数。

## 修复
- 文件：`src/lib/note/note-window-drag.js`
  - 拖动结束时通过 `onPositionPersist` 回调持久化当前逻辑坐标。
  - 如果拖动过程中出现按钮释放导致的提前结束，也会先保存当前位置再退出拖动状态。
- 文件：`src/routes/note/[id]/+page.svelte`
  - 贴纸窗口页接入 `onPositionPersist`。
  - 调用 `update_note_position(id, x, y)` 将坐标写回存储。
  - 同步更新本地 `note.x / note.y`，保持当前页状态一致。
- 文件：`src/lib/panel/use-window-sync.js`
  - 新建贴纸窗口时优先读取 note 的 `x / y` 作为创建位置。
  - 若历史数据中存在 `width / height`，也会一并用于窗口初始尺寸；缺省时仍回退到 `300 x 300`。

## 回归关注点
1. 拖动贴纸后关闭再开启桌面贴纸，应恢复到上次拖动位置。
2. 重新启动应用后，已钉住的贴纸应恢复到上次保存位置。
3. 拖动过程中不应因为频繁写存储造成明显卡顿；当前仅在拖动结束时持久化。
