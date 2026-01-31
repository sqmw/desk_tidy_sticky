# 方案C：每个贴纸一个窗口（稳定支持同屏“置顶/置底”混合）

## 背景
之前用「Top/Bottom 两个全屏 Overlay 窗口」来模拟“同屏混合”：
- 一部分贴纸显示在顶层
- 一部分贴纸贴在桌面底部（WorkerW）

该方案在 Windows + WorkerW + Flutter 全屏透明窗口下容易触发竞态：
- 切换置顶/置底时短暂消失/残影/点不动
- 多次 `SetWindowPos`/reparent 才稳定

## 核心思路
把“置顶/置底”从“窗口级 overlay”回归到“每张贴纸自己的窗口”：
- 每个 pinned 贴纸创建一个独立 Flutter 窗口（尺寸约等于贴纸卡片）。
- 每个窗口独立设置 z-order：
  - `isAlwaysOnTop=true` 或编辑模式 -> TopMost
  - 否则 -> attach WorkerW + `HWND_BOTTOM`

这样就不会再出现“两个全屏窗口交接”导致的竞态问题。

## 实现概览
- `StickyNoteWindowManager`（Panel 进程内）：
  - 监听 pinned 贴纸列表变化
  - 创建/关闭贴纸窗口（WindowController.create）
  - 广播语言、鼠标交互状态
- `NoteWindowPage`（贴纸窗口）：
  - 启动时读取 notes.json，找到对应 note
  - 根据 note 状态更新窗口大小、z-order、click-through
  - 通过 WindowListener 监听窗口移动，回写 note 的 x/y

## 关键行为
- 同屏混合（一个置顶一个置底）恢复：每张贴纸窗口独立控制。
- 鼠标交互（编辑模式）为“全局状态”：
  - 进入编辑模式后，所有贴纸窗口可交互（不穿透），并临时置顶方便操作。
  - 退出编辑模式后，每张贴纸恢复各自的置顶/置底规则。

## 手动验证
1. 创建两个贴纸并 Pin 到桌面。
2. 一个点“置顶显示”，另一个点“贴在底部”，确认同屏混合正确。
3. 切换鼠标交互，拖动贴纸，确认无残影。
4. 重启应用，确认桌面贴纸状态持久化仍生效，窗口位置正确恢复。

## 相关文件
- `lib/services/sticky_note_window_manager.dart`
- `lib/pages/note_window/note_window_page.dart`
- `lib/models/window_args.dart`
