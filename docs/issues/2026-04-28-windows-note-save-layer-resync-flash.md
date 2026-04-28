# Windows 贴纸退出编辑后闪动

## 背景

Windows 上置顶贴纸双击进入编辑后，退出编辑会先触发文本保存。保存成功后会广播 `notes_changed`，贴纸页把这类普通文本更新也当成需要重新应用原生层级的事件处理，导致 `apply_note_window_layer` 在 Windows 下重新执行 `detach/attach workerw + topmost`，从而让贴纸和可见的 workstation 主窗口一起闪动。

## 根因

`notes_changed` 之前没有区分“文本更新”和“窗口层级更新”。

- `update_note_text`：只是正文变化，不应触发原生层级重同步。
- 贴纸页监听：收到任意 `notes_changed` 都会 `loadNote -> applyInteractionPolicy -> applyZOrderAndParent`。

这让一次普通保存走上了过重的 Windows 层级切换链。

## 方案

1. 给 `notes_changed` 增加结构化 payload。
2. `update_note_text` 发送 `kind = text`、`noteId = 当前笔记`、`windowLayerChanged = false`。
3. 贴纸页监听到这类事件时：
   - 只刷新当前笔记文本状态
   - 不再执行 `applyZOrderAndParent`
   - 其他无关贴纸页也直接忽略

## 影响

- Windows：退出编辑后不再因为文本保存触发原生层级闪动。
- macOS：行为不变，只是减少了无意义的层级重应用。
- workstation / mini：仍然会收到 `notes_changed` 并刷新列表文本。

## 验证

1. Windows 上打开一张置顶贴纸。
2. 双击进入编辑，修改正文后退出编辑。
3. 确认贴纸和 workstation 主窗口不再闪动。
4. 再确认列表文本已正常刷新。
