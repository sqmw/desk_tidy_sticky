import 'package:flutter/services.dart';
import 'package:desktop_multi_window/desktop_multi_window.dart';

import '../controllers/ipc_controller.dart';
import '../controllers/locale_controller.dart';
import '../controllers/overlay_controller.dart';
import '../models/note_model.dart';
import '../models/window_args.dart';

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

  late final WindowController _windowController;
  bool _suppressLocaleBroadcast = false;

  Future<void> start() async {
    instance = this;
    _windowController = await WindowController.fromCurrentEngine();
    await _windowController.setWindowMethodHandler(_handleMethodCall);
    localeController.notifier.addListener(_handleLocaleChanged);
  }

  Future<void> _handleMethodCall(MethodCall call) async {
    final rawArgs = call.arguments;
    final args = rawArgs is Map ? rawArgs : const <Object?, Object?>{};

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
    await _sendWhere((_) => true, method, args);
  }

  Future<void> sendToPanels(
    String method, [
    Map<String, Object?>? args,
  ]) async {
    await _sendWhere((windowArgs) {
      return windowArgs.type == AppWindowType.panel;
    }, method, args);
  }

  Future<void> sendToOverlays(
    String method, [
    Map<String, Object?>? args,
  ]) async {
    await _sendWhere((windowArgs) {
      return windowArgs.type == AppWindowType.overlay;
    }, method, args);
  }

  Future<void> _sendWhere(
    bool Function(WindowArgs args) predicate,
    String method, [
    Map<String, Object?>? args,
  ]) async {
    final controllers = await WindowController.getAll();
    for (final controller in controllers) {
      if (controller.windowId == _windowController.windowId) continue;
      final windowArgs = WindowArgs.fromJsonString(controller.arguments);
      if (!predicate(windowArgs)) continue;
      try {
        await controller.invokeMethod(method, args);
      } catch (_) {
        // Window may not be ready to receive messages yet.
      }
    }
  }
}
