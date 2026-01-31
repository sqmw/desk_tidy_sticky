import 'dart:io';
import 'package:flutter/material.dart';
import 'package:desktop_multi_window/desktop_multi_window.dart';
import 'package:window_manager/window_manager.dart';
import 'config/app_config.dart';
import 'controllers/locale_controller.dart';
import 'l10n/strings.dart' as l10n;
import 'models/note_model.dart' show AppLocale;
import 'models/window_args.dart';
import 'pages/panel/panel_page.dart';
import 'pages/overlay/overlay_page.dart';
import 'pages/note_window/note_window_page.dart';
import 'services/hotkey_service.dart';
import 'services/tray_service.dart';
import 'services/panel_preferences.dart';
import 'services/window_message_service.dart';
import 'theme/app_theme.dart';
import 'controllers/ipc_scope.dart';

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

void main(List<String> args) async {
  print('[Main] Starting... PID: $pid, args: $args');
  WidgetsFlutterBinding.ensureInitialized();

  final windowController = await WindowController.fromCurrentEngine();
  final windowArgs = WindowArgs.fromJsonString(windowController.arguments);
  final appConfig = AppConfig.fromWindowArgs(windowArgs);
  print(
    '[Main] AppConfig mode: ${appConfig.mode}, isChild: ${appConfig.isChild}, monitor: ${appConfig.monitorRectArg}',
  );

  final locale = await PanelPreferences.getLanguage();
  final localeController = LocaleController(locale);
  final scope = switch (appConfig.mode) {
    AppMode.note => IpcScope.note(appConfig.noteId ?? ''),
    AppMode.overlay => IpcScope.overlay(appConfig.layer.name),
    _ => IpcScope.panel,
  };
  await WindowMessageService(localeController, scope: scope).start();
  if (appConfig.mode == AppMode.normal) {
    // Allow note windows to message the panel without accidentally broadcasting
    // to other note windows (some environments may not report arguments for
    // WindowController.getAll()).
    await PanelPreferences.setPanelWindowId(windowController.windowId);
  }

  // 1. Window Manager Init
  await windowManager.ensureInitialized();

  WindowOptions windowOptions = const WindowOptions(
    size: Size(360, 500),
    center: true,
    backgroundColor: Colors.transparent,
    skipTaskbar: true,
    titleBarStyle: TitleBarStyle.hidden,
  );

  await windowManager.waitUntilReadyToShow(windowOptions, () async {
    if (appConfig.mode == AppMode.normal) {
      // Start hidden, let hotkey/tray show it.
      await windowManager.hide();
    }
    // Prevent Windows Aero Snap (same as desk_tidy)
    await windowManager.setMaximizable(false);
  });

  // 2. Services Init
  if (appConfig.mode == AppMode.normal) {
    await TrayService().init(localeController: localeController);
    await HotkeyService.instance.init();
  }

  runApp(MyApp(localeController: localeController));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key, required this.localeController});

  final LocaleController localeController;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<AppLocale>(
      valueListenable: localeController.notifier,
      builder: (context, locale, _) {
        final strings = l10n.Strings.of(locale);
        return MaterialApp(
          title: strings.appName,
          debugShowCheckedModeBanner: false,
          navigatorKey: appNavigatorKey,
          theme: AppTheme.buildTheme(),
          home: AppConfig.instance.isOverlay
              ? OverlayPage(strings: strings)
              : AppConfig.instance.isNoteWindow
              ? NoteWindowPage(
                  noteId: AppConfig.instance.noteId ?? '',
                  strings: strings,
                )
              : PanelPage(localeController: localeController, strings: strings),
          onGenerateRoute: (settings) {
            if (settings.name == OverlayPage.routeName) {
              return MaterialPageRoute<void>(
                builder: (_) => OverlayPage(strings: strings),
                settings: settings,
                fullscreenDialog: true,
              );
            }
            return null;
          },
        );
      },
    );
  }
}
