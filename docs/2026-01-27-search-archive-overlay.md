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
- 面板层 `lib/pages/home_page.dart`
  - 新建输入框与搜索框分离：输入框 Enter 保存；搜索框只影响过滤排序。

### 2) 归档/恢复（Archive）
- `lib/services/notes_service.dart` 增加 `toggleArchive`
- 排序策略：
  - Archived 永远排在底部（Active 模式不会显示）
  - Active 中 pinned 优先，其次按 updatedAt 降序
- UI：
  - `SegmentedButton` 切换 `Active / Archived`
  - Dismissible：右滑删除；左滑归档/恢复
  - 列表尾部提供 Archive/Unarchive 按钮兜底

### 3) 编辑（Edit）
- Panel 列表提供 Edit 按钮，弹窗修改文本并更新 `updatedAt`。
- Overlay 卡片支持双击编辑（进入编辑时会自动关闭 click-through，避免点不住）。

### 4) Overlay 拖拽落盘优化
- 之前实现：`onPanUpdate` 每次都 `updateNote` -> 写文件过频。
- 现在实现：`lib/pages/overlay/overlay_page.dart`
  - 拖拽过程中只更新内存位置（`Map<String, Offset>`）
  - `onPanEnd` 再写入 notes.json（commit once）

## 手动验证清单
1) 新建输入框输入内容，按 Enter 保存并按配置自动隐藏。
2) 搜索框输入：
   - 英文：`build` 能匹配包含的 note
   - 中文拼音首字母：例如 `桌面整理` 可用 `zm` 搜到
3) 左滑归档：Active 消失；切换到 Archived 可看到；点击/左滑恢复可回到 Active。
4) Overlay 拖拽：拖动结束后重启应用，位置能恢复。
