
# 2026-01-27 — 搜索/归档/编辑/Overlay 交互改进

## 目标
- 面板输入区只负责“新建便笺”，搜索应与输入解耦（避免边写边把列表过滤空）。
- 便笺需要可归档/恢复（不丢数据），并且能快速切换查看 Active / Archived。
- Overlay 拖拽不要每一帧都落盘，避免写入过频导致卡顿/IO 放大。

## 实现要点
### 1) 独立搜索框 + 拼音支持
- 新增 `lib/utils/note_search.dart`
  - 规范化：只保留字母/数字/中文字符，统一 lower-case。
  - 拼音：使用 `lpinyin` 生成 full pinyin 与 initials。
  - 匹配与打分：exact/prefix/contains/pinyin/initials/subsequence 逐级降分，用于排序。
- 面板层实现：输入框 Enter 保存；搜索框只影响过滤排序。

### 2) 归档/恢复（Archive）
- `lib/services/notes_service.dart` 增加 `toggleArchive`
- 排序：Archived 永远在底部；Active 内 pinned 优先，其次按 updatedAt 降序
- UI：`SegmentedButton` 切换 Active/Archived；右滑删除、左滑归档/恢复；尾部按钮兜底

### 3) 编辑（Edit）
- Panel 列表提供 Edit 按钮；弹窗修改文本并更新时间。
- Overlay 卡片支持双击编辑（进入编辑时会自动关闭 click-through）。

### 4) Overlay 拖拽落盘优化
- 拖动时只改内存位置；`onPanEnd` 再写 notes.json（commit once）。

## 手动验证清单
1) 输入 + Enter 保存，按配置自动隐藏。
2) 搜索：`build` 可匹配英文；`zm` 可匹配“桌面整理”。
3) 左滑归档，切到 Archived 能看到；再左滑或点击恢复。
4) Overlay 拖拽后重启位置能恢复。

## 语言 / IPC
- 面板右上角翻译按钮，可中英切换；语言偏好写入 shared_preferences。
- stdin JSON IPC 预留：`{"cmd":"set_language","value":"zh"}` 或 `"en"` 可被子进程接收，便于主程序控制。

## Overlay 进一步修正
- Overlay 覆盖使用虚拟屏幕尺寸，拖拽位置会 clamp 到可视范围，避免卡片超出可见区域。
- 新增鼠标交互切换：托盘菜单提供 “Overlay: Toggle mouse interaction”，全局热键 `Ctrl+Shift+O` 也可切换。
- 说明：当 Overlay 覆盖整个桌面且未开启 click-through 时，可能会阻挡托盘点击。此时使用热键切换。
- 新增 UX：开启穿透后，右上工具条自动淡出，避免误触；左上浮现提示“Ctrl+Shift+O 或托盘切换鼠标交互”，2 秒后自动消失。
- 关闭 Overlay（X）时，如果是从面板进入（非 `--mode=overlay`），会恢复窗口默认尺寸并居中，避免残留巨屏窗口。

## WorkerW 嵌入（实验）
- 增加 WorkerW 嵌入接口：Overlay 窗口可尝试 SetParent 到 WorkerW，使其位于桌面图标下方。
- 启动方式：`desk_tidy_sticky.exe --mode=overlay --embed-workerw`
- 说明：Flutter 单窗口限制下，Overlay 与 Panel 共用同一个窗口句柄，因此推荐以独立进程模式启动 overlay（即使用 --mode=overlay）。

## 多屏 Overlay（多进程）
- 多屏不再使用“虚拟屏幕一张大窗”作为默认策略；改为每个显示器一个 overlay 子进程。
- 入口：面板点击 Overlay 时，优先启动子进程 overlays；失败再回退到单进程 overlay route。
- 细节见：`docs/2026-01-27-multi-process-overlay.md`

## 启动模式
- 普通模式（默认）：面板 + 托盘 + 热键。
- 后台模式：`--background`（作为 desk_tidy 子进程，仅后台 IPC，不注册托盘/热键）。
- Overlay 模式：`--mode=overlay`（只显示 overlay，不注册托盘/热键）。
