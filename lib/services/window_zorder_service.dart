import 'dart:io';

import 'package:window_manager/window_manager.dart';
import 'package:win32/win32.dart' as win32;

class WindowZOrderService {
  WindowZOrderService._();

  static Future<void> setAlwaysOnTopNoActivate(bool value) async {
    if (!Platform.isWindows) {
      await windowManager.setAlwaysOnTop(value);
      return;
    }

    final hwnd = await windowManager.getId();
    final insertAfter = value ? win32.HWND_TOPMOST : win32.HWND_NOTOPMOST;

    win32.SetWindowPos(
      hwnd,
      insertAfter,
      0,
      0,
      0,
      0,
      win32.SWP_NOMOVE | win32.SWP_NOSIZE | win32.SWP_NOACTIVATE,
    );
  }

  static Future<void> setBottomNoActivate() async {
    if (!Platform.isWindows) {
      return;
    }
    final hwnd = await windowManager.getId();
    win32.SetWindowPos(
      hwnd,
      win32.HWND_BOTTOM,
      0,
      0,
      0,
      0,
      win32.SWP_NOMOVE | win32.SWP_NOSIZE | win32.SWP_NOACTIVATE,
    );
  }

  static Future<void> showNoActivate() async {
    if (!Platform.isWindows) {
      await windowManager.show();
      return;
    }

    final hwnd = await windowManager.getId();
    win32.ShowWindow(hwnd, win32.SW_SHOWNOACTIVATE);
    win32.SetWindowPos(
      hwnd,
      0,
      0,
      0,
      0,
      0,
      win32.SWP_NOMOVE |
          win32.SWP_NOSIZE |
          win32.SWP_NOACTIVATE |
          win32.SWP_NOZORDER |
          win32.SWP_SHOWWINDOW,
    );
  }
}
