import 'dart:io';
import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';
import 'config/app_config.dart';
import 'controllers/locale_controller.dart';
import 'l10n/strings.dart';
import 'models/note_model.dart';
import 'pages/panel/panel_page.dart';
import 'pages/overlay/overlay_page.dart';
import 'services/hotkey_service.dart';
import 'services/ipc_service.dart';
import 'services/tray_service.dart';
import 'services/panel_preferences.dart';

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

void main(List<String> args) async {
  print('[Main] Starting... PID: $pid, args: $args');
  WidgetsFlutterBinding.ensureInitialized();

  final appConfig = AppConfig.fromArgs(args);
  print(
    '[Main] AppConfig mode: ${appConfig.mode}, isChild: ${appConfig.isChild}, monitor: ${appConfig.monitorRectArg}',
  );

  final locale = await PanelPreferences.getLanguage();
  final localeController = LocaleController(locale);
  IpcService(localeController).start();

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
    if (!appConfig.isOverlay) {
      // Start hidden, let hotkey/tray show it
      await windowManager.hide();
    }
    // Prevent Windows Aero Snap (same as desk_tidy)
    await windowManager.setMaximizable(false);
  });

  // 2. Services Init
  if (!appConfig.isChild && !appConfig.isBackground) {
    if (!appConfig.isOverlay) {
      await TrayService().init(localeController: localeController);
    }
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
        final strings = Strings.of(locale);
        return MaterialApp(
          title: strings.appName,
          debugShowCheckedModeBanner: false,
          navigatorKey: appNavigatorKey,
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(seedColor: Colors.amber),
            useMaterial3: true,
            fontFamily: 'Segoe UI', // Good for Windows
            fontFamilyFallback: const ['Microsoft YaHei'],
            visualDensity: VisualDensity.adaptivePlatformDensity,
          ),
          home: AppConfig.instance.isOverlay
              ? OverlayPage(strings: strings)
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
