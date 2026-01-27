import '../models/note_model.dart';

class Strings {
  final AppLocale locale;
  const Strings._(this.locale);

  static Strings of(AppLocale locale) => _instances[locale]!;

  static const _instances = {
    AppLocale.en: Strings._(AppLocale.en),
    AppLocale.zh: Strings._(AppLocale.zh),
  };

  String get appName =>
      locale == AppLocale.zh ? 'Desk Tidy 便笺' : 'Desk Tidy Sticky';
  String get inputHint =>
      locale == AppLocale.zh ? '输入便笺…（回车保存）' : 'Type a note... (Enter to save)';
  String get saveNote => locale == AppLocale.zh ? '保存' : 'Save';
  String get saveNoteAction => locale == AppLocale.zh ? '保存便笺' : 'Save note';
  String get cancel => locale == AppLocale.zh ? '取消' : 'Cancel';
  String get hideAfterSave =>
      locale == AppLocale.zh ? '保存后隐藏' : 'Hide after save';
  String get active => locale == AppLocale.zh ? '活动' : 'Active';
  String get archived => locale == AppLocale.zh ? '已归档' : 'Archived';
  String get overlay => locale == AppLocale.zh ? '桌面贴纸' : 'Desktop overlay';
  String get searchHint =>
      locale == AppLocale.zh ? '搜索（支持拼音）…' : 'Search (pinyin supported)...';
  String get edit => locale == AppLocale.zh ? '编辑' : 'Edit';
  String get delete => locale == AppLocale.zh ? '删除' : 'Delete';
  String get clear => locale == AppLocale.zh ? '清除' : 'Clear';
  String get hideWindow => locale == AppLocale.zh ? '隐藏窗口' : 'Hide window';
  String get language => locale == AppLocale.zh ? '语言' : 'Language';
  String get archive => locale == AppLocale.zh ? '归档' : 'Archive';
  String get unarchive => locale == AppLocale.zh ? '恢复' : 'Unarchive';
  String get pinWindow => locale == AppLocale.zh ? '窗口置顶' : 'Pin window';
  String get unpinWindow => locale == AppLocale.zh ? '取消置顶' : 'Unpin window';
  String get pinNote => locale == AppLocale.zh ? '钉住便笺' : 'Pin note';
  String get unpinNote => locale == AppLocale.zh ? '取消钉住' : 'Unpin note';
  String get markDone => locale == AppLocale.zh ? '标记完成' : 'Mark done';
  String get markUndone => locale == AppLocale.zh ? '取消完成' : 'Mark undone';
  String get overlayClickThrough =>
      locale == AppLocale.zh ? '鼠标交互' : 'Mouse interaction';
  String get overlayClose => locale == AppLocale.zh ? '关闭贴纸' : 'Close overlay';
  String get overlayTip => locale == AppLocale.zh
      ? '用 Ctrl+Shift+O 或托盘切换鼠标交互'
      : 'Use Ctrl+Shift+O or tray to toggle mouse interaction';

  String get trayShowNotes => locale == AppLocale.zh ? '显示便笺' : 'Show notes';
  String get trayNewNote => locale == AppLocale.zh ? '新建便笺' : 'New note';
  String get trayOverlay => locale == AppLocale.zh ? '桌面贴纸' : 'Desktop overlay';
  String get trayOverlayToggleClickThrough => locale == AppLocale.zh
      ? '贴纸：切换鼠标交互'
      : 'Overlay: Toggle mouse interaction';
  String get trayOverlayClose =>
      locale == AppLocale.zh ? '贴纸：关闭' : 'Overlay: Close';
  String get trayExit => locale == AppLocale.zh ? '退出' : 'Exit';

  String get sortByCustom => locale == AppLocale.zh ? '手动' : 'Manual';
  String get sortByNewest => locale == AppLocale.zh ? '最新' : 'Newest';
  String get sortByOldest => locale == AppLocale.zh ? '最早' : 'Oldest';
  String get sortMode => locale == AppLocale.zh ? '排序' : 'Sort';
  String get trash => locale == AppLocale.zh ? '回收站' : 'Trash';
  String get restore => locale == AppLocale.zh ? '恢复' : 'Restore';
  String get permanentlyDelete =>
      locale == AppLocale.zh ? '永久删除' : 'Permanent delete';
  String get emptyTrash => locale == AppLocale.zh ? '清空回收站' : 'Empty trash';
}
