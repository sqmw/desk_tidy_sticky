import 'dart:io';
import 'package:flutter/material.dart';
import 'package:system_tray/system_tray.dart';
import 'package:window_manager/window_manager.dart';
import '../controllers/locale_controller.dart';
import '../controllers/overlay_controller.dart';
import '../l10n/strings.dart';
import '../main.dart';
import '../pages/overlay/overlay_page.dart';
import 'overlay_process_manager.dart';

class TrayService {
  final SystemTray _systemTray = SystemTray();
  static final TrayService _instance = TrayService._internal();
  factory TrayService() => _instance;
  TrayService._internal();
  final OverlayController _overlayController = OverlayController.instance;
  final OverlayProcessManager _overlayManager = OverlayProcessManager.instance;
  LocaleController? _localeController;

  Future<void> init({required LocaleController localeController}) async {
    _localeController = localeController;

    final iconPath = await _resolveIconPath();

    await _systemTray.initSystemTray(
      title: "Desk Tidy Sticky",
      iconPath: iconPath,
    );

    _rebuildMenu(Strings.of(localeController.current));
    localeController.notifier.addListener(_handleLocaleChanged);

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

  void _handleLocaleChanged() {
    final lc = _localeController;
    if (lc == null) return;
    _rebuildMenu(Strings.of(lc.current));
  }

  Future<void> _rebuildMenu(Strings strings) async {
    final Menu menu = Menu();
    await menu.buildFrom([
      MenuItemLabel(
        label: strings.trayShowNotes,
        onClicked: (menuItem) => windowManager.show(),
      ),
      MenuItemLabel(
        label: strings.trayNewNote,
        onClicked: (menuItem) {
          windowManager.show();
          // and focus input? (Todo)
        },
      ),
      MenuItemLabel(
        label: strings.trayOverlay,
        onClicked: (_) async {
          await _openOverlayFromTray();
        },
      ),
      MenuItemLabel(
        label: strings.trayOverlayToggleClickThrough,
        onClicked: (_) async {
          if (_overlayManager.isRunning) {
            await _overlayManager.toggleClickThroughAll();
          } else {
            _overlayController.toggleClickThrough();
          }
        },
      ),
      MenuItemLabel(
        label: strings.trayOverlayClose,
        onClicked: (_) async {
          if (_overlayManager.isRunning) {
            _overlayManager.closeAll();
            await _overlayManager.stopAll();
          } else {
            _overlayController.setClickThrough(false);
            appNavigatorKey.currentState?.popUntil((route) => route.isFirst);
          }
        },
      ),
      MenuSeparator(),
      MenuItemLabel(
        label: strings.trayExit,
        onClicked: (_) async {
          await _overlayManager.stopAll();
          exit(0);
        },
      ),
    ]);

    await _systemTray.setContextMenu(menu);
  }

  Future<void> _openOverlayFromTray() async {
    if (_overlayManager.isRunning) return;
    final lc = _localeController;
    if (lc == null) return;

    final ok = await _overlayManager.startAll(
      localeController: lc,
      embedWorkerW: true,
      initialClickThrough: false,
    );
    if (ok) return;

    _overlayController.setClickThrough(false);
    await windowManager.show();
    appNavigatorKey.currentState?.pushNamed(OverlayPage.routeName);
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
