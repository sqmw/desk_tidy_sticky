enum AppLocale { en, zh }

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
  String get saveNoteAction =>
      locale == AppLocale.zh ? '保存便笺' : 'Save note';
  String get cancel => locale == AppLocale.zh ? '取消' : 'Cancel';
  String get saveAndPin => locale == AppLocale.zh ? '保存并贴到桌面' : 'Save & pin';
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
      locale == AppLocale.zh ? '鼠标穿透' : 'Click-through';
  String get overlayRefresh =>
      locale == AppLocale.zh ? '刷新贴纸' : 'Refresh notes';
  String get overlayClose => locale == AppLocale.zh ? '关闭贴纸' : 'Close overlay';
  String get overlayTip => locale == AppLocale.zh
      ? '按 Esc 取消穿透'
      : 'Press Esc to disable click-through';
}
