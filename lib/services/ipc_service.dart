import 'dart:convert';
import 'dart:io';

import '../controllers/locale_controller.dart';
import '../l10n/strings.dart';

/// Minimal stdin JSON IPC stub so parent process可以控制语言等。
/// 格式示例：
/// {"cmd":"set_language","value":"zh"}
class IpcService {
  IpcService(this.localeController);

  final LocaleController localeController;

  void start() {
    stdin
        .transform(utf8.decoder)
        .transform(const LineSplitter())
        .listen(_handleLine);
  }

  Future<void> _handleLine(String line) async {
    try {
      final data = jsonDecode(line);
      if (data is! Map) return;
      final cmd = data['cmd'];
      switch (cmd) {
        case 'set_language':
          final value = data['value'] as String?;
          if (value == 'zh') {
            await localeController.setLocale(AppLocale.zh);
          } else if (value == 'en') {
            await localeController.setLocale(AppLocale.en);
          }
          break;
        default:
          break;
      }
    } catch (_) {
      // Ignore malformed messages.
    }
  }
}
