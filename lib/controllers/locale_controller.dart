import 'package:flutter/foundation.dart';

import '../l10n/strings.dart';
import '../services/panel_preferences.dart';

class LocaleController {
  LocaleController(AppLocale initial)
    : notifier = ValueNotifier<AppLocale>(initial);

  final ValueNotifier<AppLocale> notifier;

  AppLocale get current => notifier.value;

  Future<void> setLocale(AppLocale locale) async {
    if (locale == notifier.value) return;
    notifier.value = locale;
    await PanelPreferences.setLanguage(locale);
  }
}
