import 'package:flutter/foundation.dart';
import 'package:desktop_multi_window/desktop_multi_window.dart';

import '../controllers/overlay_controller.dart';
import '../controllers/locale_controller.dart';
import '../models/monitor_rect.dart';
import '../models/window_args.dart';
import '../models/overlay_layer.dart';
import 'display_service.dart';
import 'window_message_service.dart';

class OverlayWindowManager {
  static final OverlayWindowManager instance = OverlayWindowManager._();

  OverlayWindowManager._() {
    OverlayController.instance.clickThrough.addListener(
      _handleClickThroughChanged,
    );
  }

  final Map<String, WindowController> _windows = {};
  bool _clickThrough = true;

  final ValueNotifier<bool> isRunningNotifier = ValueNotifier<bool>(false);
  bool get isRunning => isRunningNotifier.value;

  Future<bool> startAll({
    required LocaleController localeController,
    required bool embedWorkerW,
    bool initialClickThrough = true,
  }) async {
    if (isRunning) return true;

    final monitors = DisplayService.getMonitors();
    if (monitors.isEmpty) return false;

    _clickThrough = initialClickThrough;
    OverlayController.instance.setClickThrough(_clickThrough);

    for (final m in monitors) {
      for (final layer in [OverlayLayer.bottom, OverlayLayer.top]) {
        final ok = await _startOne(
          monitor: m,
          layer: layer,
          embedWorkerW: embedWorkerW,
        );
        if (!ok) {
          await stopAll();
          return false;
        }
      }
    }

    isRunningNotifier.value = _windows.isNotEmpty;

    await WindowMessageService.instance.sendToAll(
      'set_language',
      {'value': localeController.current.name},
    );
    await WindowMessageService.instance.sendToAll(
      'set_click_through',
      {'value': _clickThrough},
    );

    return true;
  }

  Future<void> stopAll() async {
    if (_windows.isEmpty) return;
    _windows.clear();
    isRunningNotifier.value = false;
    await WindowMessageService.instance.sendToAll('close_overlay');
  }

  Future<void> toggleClickThroughAll() async {
    OverlayController.instance.toggleClickThrough();
  }

  void refreshAll() {
    WindowMessageService.instance.sendToAll('refresh_notes');
  }

  void closeAll() {
    WindowMessageService.instance.sendToAll('close_overlay');
  }

  Future<bool> _startOne({
    required MonitorRect monitor,
    required OverlayLayer layer,
    required bool embedWorkerW,
  }) async {
    try {
      final args = WindowArgs.overlay(
        layer: layer,
        monitorRectArg: monitor.toArg(),
        embedWorkerW: embedWorkerW,
      );
      final controller = await WindowController.create(
        WindowConfiguration(
          hiddenAtLaunch: true,
          arguments: args.toJsonString(),
        ),
      );
      _windows['${monitor.monitorId}_${layer.name}'] = controller;
      await controller.show();
      return true;
    } catch (_) {
      return false;
    }
  }

  void _handleClickThroughChanged() {
    if (!isRunning) return;
    _clickThrough = OverlayController.instance.clickThrough.value;
    WindowMessageService.instance.sendToAll(
      'set_click_through',
      {'value': _clickThrough},
    );
  }
}
