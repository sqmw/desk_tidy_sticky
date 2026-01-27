import 'dart:convert';
import 'dart:io';

import '../controllers/locale_controller.dart';
import '../controllers/overlay_controller.dart';
import '../controllers/ipc_controller.dart';
import '../l10n/strings.dart';

/// Minimal stdin JSON IPC stub so parent process可以控制语言等。
/// 格式示例：
/// {"cmd":"set_language","value":"zh"}
class IpcService {
  IpcService(
    this.localeController, {
    OverlayController? overlayController,
    IpcController? ipcController,
  })  : overlayController = overlayController ?? OverlayController.instance,
        ipcController = ipcController ?? IpcController.instance;

  final LocaleController localeController;
  final OverlayController overlayController;
  final IpcController ipcController;

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
        case 'set_click_through':
          final value = data['value'];
          if (value is bool) {
            overlayController.setClickThrough(value);
          }
          break;
        case 'refresh_notes':
          ipcController.requestRefresh();
          break;
        case 'close_overlay':
          ipcController.requestClose();
          break;
        default:
          break;
      }
    } catch (_) {
      // Ignore malformed messages.
    }
  }
}
