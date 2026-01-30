import 'dart:io';
import 'package:flutter/material.dart';
import 'package:system_tray/system_tray.dart';
import 'package:window_manager/window_manager.dart';
import '../controllers/locale_controller.dart';
import '../controllers/overlay_controller.dart';
import '../l10n/strings.dart';
import 'overlay_window_manager.dart';
import 'panel_preferences.dart';
import 'tray_menu_guard.dart';

class TrayService {
  final SystemTray _systemTray = SystemTray();
  static final TrayService _instance = TrayService._internal();
  factory TrayService() => _instance;
  TrayService._internal();
  final OverlayWindowManager _overlayManager = OverlayWindowManager.instance;
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
    _overlayManager.isRunningNotifier.addListener(_handleStickerStatusChanged);

    _systemTray.registerSystemTrayEventHandler((eventName) {
      debugPrint("eventName: $eventName");
      if (eventName == kSystemTrayEventClick) {
        windowManager.isVisible().then((visible) async {
          if (visible) {
            await windowManager.hide();
          } else {
            await windowManager.show();
            await windowManager.focus();
          }
        });
      } else if (eventName == kSystemTrayEventRightClick) {
        TrayMenuGuard.instance.markMenuOpen();
        _systemTray.popUpContextMenu();
      }
    });
  }

  void _handleLocaleChanged() {
    final lc = _localeController;
    if (lc == null) return;
    _rebuildMenu(Strings.of(lc.current));
  }

  void _handleStickerStatusChanged() {
    final lc = _localeController;
    if (lc == null) return;
    _rebuildMenu(Strings.of(lc.current));
  }

  Future<void> _rebuildMenu(Strings strings) async {
    final Menu menu = Menu();
    final isRunning = _overlayManager.isRunning;

    await menu.buildFrom([
      MenuItemLabel(
        label: strings.trayShowNotes,
        onClicked: (menuItem) async {
          await windowManager.show();
          await windowManager.focus();
        },
      ),
      MenuItemLabel(
        label: strings.trayNewNote,
        onClicked: (menuItem) async {
          await windowManager.show();
          await windowManager.focus();
          // Todo: focus specific input
        },
      ),
      MenuSeparator(),
      MenuItemLabel(
        label: isRunning ? strings.trayOverlayClose : strings.trayOverlay,
        onClicked: (_) async {
          if (isRunning) {
            await _overlayManager.stopAll();
          } else {
            await _openOverlayFromTray();
          }
        },
      ),
      if (isRunning)
        MenuItemLabel(
          label: strings.trayOverlayToggleClickThrough,
          onClicked: (_) async {
            await _overlayManager.toggleClickThroughAll();
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

    const clickThrough = true;
    OverlayController.instance.setClickThrough(true);

    await _overlayManager.startAll(
      localeController: lc,
      embedWorkerW: true,
      initialClickThrough: clickThrough,
    );
    await PanelPreferences.setOverlayEnabled(true);
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
