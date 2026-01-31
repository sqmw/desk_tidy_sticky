# 桌面贴纸重复窗口（同一便签出现多份）

## 现象
- 开启桌面贴纸后，同一条 pinned 便签出现两份甚至多份窗口。
- 常见触发场景：
  - 热重载/异常退出后重新运行
  - 旧的 note/overlay 窗口仍存活，主面板再次启动又创建了一遍

## 根因
- `StickyNoteWindowManager` 只在内存里记录 `_noteWindows`。
- 当应用重启或窗口未被正确关闭时，系统里仍存在旧的 note window。
- 新的面板启动后再次创建窗口，导致同一 noteId 对应多个窗口。

## 修复
- 启动桌面贴纸时先扫描 `WindowController.getAll()`：
  - 关闭遗留的 legacy overlay 窗口（Scheme C 下不再使用）
  - 按 `noteId` 去重：保留第一个，关闭其余重复窗口
  - 将存活窗口“收编”进 `_noteWindows`，后续只增量创建缺失窗口

## 影响文件
- `lib/services/sticky_note_window_manager.dart`
