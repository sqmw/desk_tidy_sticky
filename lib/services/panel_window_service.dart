import 'package:window_manager/window_manager.dart';

import 'log_service.dart';

class PanelWindowService {
  PanelWindowService._();

  static Future<void> show({bool focus = true}) async {
    try {
      if (await windowManager.isMinimized()) {
        await windowManager.restore();
      }
      await windowManager.show();
      if (focus) {
        await windowManager.focus();
      }
    } catch (e, s) {
      await LogService.error('Failed to show panel window: $e\n$s');
    }
  }

  static Future<void> hide() async {
    try {
      await windowManager.hide();
    } catch (e, s) {
      await LogService.error('Failed to hide panel window: $e\n$s');
    }
  }

  static Future<void> toggle({bool allowHideWhenNotFocused = false}) async {
    try {
      final visible = await windowManager.isVisible();
      if (!visible) {
        await show();
        return;
      }
      final focused = await windowManager.isFocused();
      if (!focused && !allowHideWhenNotFocused) {
        await show();
        return;
      }
      await hide();
    } catch (e, s) {
      await LogService.error('Failed to toggle panel window: $e\n$s');
    }
  }

  static Future<void> toggleVisibility() async {
    await toggle(allowHideWhenNotFocused: true);
  }

  static Future<void> ensureHidden({
    List<Duration> retries = const [
      Duration(milliseconds: 120),
      Duration(milliseconds: 360),
      Duration(milliseconds: 900),
    ],
  }) async {
    await hide();
    for (final delay in retries) {
      await Future.delayed(delay);
      final visible = await windowManager.isVisible();
      if (!visible) return;
      await hide();
    }
  }
}
