import 'dart:io';
import 'package:flutter/material.dart';
import 'package:system_tray/system_tray.dart';
import 'package:window_manager/window_manager.dart';
import '../main.dart';
import '../pages/overlay/overlay_page.dart';

class TrayService {
  final SystemTray _systemTray = SystemTray();
  static final TrayService _instance = TrayService._internal();
  factory TrayService() => _instance;
  TrayService._internal();

  Future<void> init() async {
    final iconPath = await _resolveIconPath();

    await _systemTray.initSystemTray(
      title: "Desk Tidy Sticky",
      iconPath: iconPath,
    );

    final Menu menu = Menu();
    await menu.buildFrom([
      MenuItemLabel(
        label: 'Show Notes',
        onClicked: (menuItem) => windowManager.show(),
      ),
      MenuItemLabel(
        label: 'New Note',
        onClicked: (menuItem) {
          windowManager.show();
          // and focus input? (Todo)
        },
      ),
      MenuItemLabel(
        label: 'Desktop Overlay',
        onClicked: (_) async {
          await windowManager.show();
          appNavigatorKey.currentState?.pushNamed(OverlayPage.routeName);
        },
      ),
      MenuSeparator(),
      MenuItemLabel(label: 'Exit', onClicked: (menuItem) => exit(0)),
    ]);

    await _systemTray.setContextMenu(menu);

    _systemTray.registerSystemTrayEventHandler((eventName) {
      debugPrint("eventName: $eventName");
      if (eventName == kSystemTrayEventClick) {
        windowManager.isVisible().then((visible) {
          if (visible) {
            windowManager.hide();
          } else {
            windowManager.show();
          }
        });
      } else if (eventName == kSystemTrayEventRightClick) {
        _systemTray.popUpContextMenu();
      }
    });
  }

  Future<String> _resolveIconPath() async {
    // Prefer the packaged runner icon on Windows; fallback to png for other OS.
    if (Platform.isWindows) {
      final exeDir = File(Platform.resolvedExecutable).parent.path;
      final candidate = '$exeDir/app_icon.ico';
      if (File(candidate).existsSync()) {
        return candidate;
      }
      final devIcon =
          '${Directory.current.path}\\windows\\runner\\resources\\app_icon.ico';
      if (File(devIcon).existsSync()) {
        return devIcon;
      }
    }
    return 'assets/app_icon.png';
  }
}
