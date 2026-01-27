import 'package:shared_preferences/shared_preferences.dart';

import '../pages/panel/panel_page.dart';
import '../l10n/strings.dart';
import '../services/notes_service.dart';

class PanelPreferences {
  PanelPreferences._();

  static const _kHideAfterSave = 'panel_hide_after_save';
  static const _kWindowPinned = 'panel_window_pinned';
  static const _kViewMode = 'panel_view_mode';
  static const _kLanguage = 'panel_language';
  static const _kSortMode = 'panel_sort_mode';

  static Future<bool> getHideAfterSave() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_kHideAfterSave) ?? true;
  }

  static Future<void> setHideAfterSave(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kHideAfterSave, value);
  }

  static Future<bool> getWindowPinned() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_kWindowPinned) ?? false;
  }

  static Future<void> setWindowPinned(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kWindowPinned, value);
  }

  static Future<NoteViewMode> getViewMode() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kViewMode);
    return raw == 'archived' ? NoteViewMode.archived : NoteViewMode.active;
  }

  static Future<void> setViewMode(NoteViewMode value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _kViewMode,
      value == NoteViewMode.archived ? 'archived' : 'active',
    );
  }

  static Future<AppLocale> getLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kLanguage);
    return raw == 'zh' ? AppLocale.zh : AppLocale.en;
  }

  static Future<void> setLanguage(AppLocale locale) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kLanguage, locale == AppLocale.zh ? 'zh' : 'en');
  }

  static Future<NoteSortMode> getSortMode() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kSortMode);
    return NoteSortMode.values.firstWhere(
      (e) => e.name == raw,
      orElse: () => NoteSortMode.custom,
    );
  }

  static Future<void> setSortMode(NoteSortMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kSortMode, mode.name);
  }
}
