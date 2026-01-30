import 'package:flutter/services.dart';
import 'package:desktop_multi_window/desktop_multi_window.dart';

import '../controllers/ipc_controller.dart';
import '../controllers/locale_controller.dart';
import '../controllers/overlay_controller.dart';
import '../models/note_model.dart';

class WindowMessageService {
  WindowMessageService(
    this.localeController, {
    OverlayController? overlayController,
    IpcController? ipcController,
  }) : overlayController = overlayController ?? OverlayController.instance,
       ipcController = ipcController ?? IpcController.instance;

  static late WindowMessageService instance;

  final LocaleController localeController;
  final OverlayController overlayController;
  final IpcController ipcController;

  final WindowMethodChannel _channel = WindowMethodChannel(
    'desk_tidy_sticky',
  );
  late final WindowController _windowController;
  bool _suppressLocaleBroadcast = false;

  Future<void> start() async {
    instance = this;
    _windowController = await WindowController.fromCurrentEngine();
    _channel.setMethodCallHandler(_handleMethodCall);
    localeController.notifier.addListener(_handleLocaleChanged);
  }

  Future<void> _handleMethodCall(MethodCall call) async {
    final rawArgs = call.arguments;
    final args = rawArgs is Map ? rawArgs : const <Object?, Object?>{};
    final sourceId = args['sourceWindowId'] as int?;
    if (sourceId != null && sourceId == _windowController.windowId) {
      return;
    }

    switch (call.method) {
      case 'set_language':
        final value = args['value'] as String?;
        final target = value == 'zh'
            ? AppLocale.zh
            : value == 'en'
            ? AppLocale.en
            : null;
        if (target == null) return;
        _suppressLocaleBroadcast = true;
        try {
          await localeController.setLocale(target);
        } finally {
          _suppressLocaleBroadcast = false;
        }
        break;
      case 'set_click_through':
        final value = args['value'];
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
  }

  void _handleLocaleChanged() {
    if (_suppressLocaleBroadcast) return;
    sendToAll(
      'set_language',
      {'value': localeController.current.name},
    );
  }

  Future<void> sendToAll(String method, [Map<String, Object?>? args]) async {
    final payload = <String, Object?>{
      if (args != null) ...args,
      'sourceWindowId': _windowController.windowId,
    };
    await _channel.invokeMethod(method, payload);
  }
}
