# 桌面贴纸开启后无反应（需点一次“鼠标交互”才出现）

## 现象
- 已经有 pinned 贴纸时，开启“桌面贴纸”没有任何显示。
- 或者在桌面贴纸开启状态下，首次 pin 一条贴纸也不出现。
- 需要再点一次“鼠标交互”切换，贴纸窗口才会出现/被唤醒。

## 原因
- `desktop_multi_window` 新建窗口后，Flutter 引擎/平台通道注册有时间差。
- 透明窗口在启动早期如果立即执行 WorkerW reparent + z-order 切换，
  某些系统会出现“窗口创建了但没真正被 surface”。
- 点击“鼠标交互”会触发后续的 show/z-order 更新，从而把窗口唤醒。
- WorkerW 查找若命中“承载桌面图标的那层 WorkerW”，贴纸窗口会被图标层遮住，
  表现为“创建了但看不见”；切到鼠标交互后置顶才显形。

## 修复
- 对新建的 note window 做 2 次延迟 `show + refresh_notes`（150ms/400ms）。
- note window 自身在首帧后再补一次 `_applyMouseModeAndZOrder()`，
  并在 250ms 后再补一次，确保 WorkerW/z-order 生效并且窗口可见。
- 对“贴在底部”窗口使用 WorkerW reparent，确保在桌面可见且位于桌面层。
- 修复 WorkerW 查找逻辑：当 `SHELLDLL_DefView` 由 WorkerW 承载时直接使用该 WorkerW，
  优先返回其后继的 WorkerW（桌面内容层），并增加 `FindWindowEx` fallback，
  降低 `workerw=0` 的概率。

## 影响文件
- `lib/services/sticky_note_window_manager.dart`
- `lib/pages/note_window/note_window_page.dart`
- `lib/services/workerw_service.dart`
