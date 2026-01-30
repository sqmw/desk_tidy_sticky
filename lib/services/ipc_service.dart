import 'dart:convert';
import 'dart:io';

import '../controllers/locale_controller.dart';
import '../controllers/overlay_controller.dart';
import '../controllers/ipc_controller.dart';
import '../models/note_model.dart';

/// Minimal stdin JSON IPC stub so parent process可以控制语言等。
/// 格式示例：
/// {"cmd":"set_language","value":"zh"}
class IpcService {
  IpcService(
    this.localeController, {
    OverlayController? overlayController,
    IpcController? ipcController,
  }) : overlayController = overlayController ?? OverlayController.instance,
       ipcController = ipcController ?? IpcController.instance;

  final LocaleController localeController;
  final OverlayController overlayController;
  final IpcController ipcController;

  static late IpcService instance;

  void start() {
    instance = this; // Assign singleton on start
    stdin
        .transform(utf8.decoder)
        .transform(const LineSplitter())
        .listen(
          _handleLine,
          onDone: () {
            // Parent closed pipe or died. Exit self.
            exit(0);
          },
        );
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

  /// Sends a command to the parent process via stdout.
  /// Format: IPC_JSON:{"cmd":"..."}
  void sendToParent(String cmd) {
    // Only child processes should send to parent
    // But we don't strictly check AppConfig here for simplicity.
    final jsonStr = jsonEncode({'cmd': cmd});
    // Use a specific prefix so parent knows it's an IPC message, not just debug log.
    print('IPC_JSON:$jsonStr');
  }
}
