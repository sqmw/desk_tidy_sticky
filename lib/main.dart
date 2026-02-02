import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:desktop_multi_window/desktop_multi_window.dart';
import 'package:window_manager/window_manager.dart';

import 'config/app_config.dart';
import 'controllers/locale_controller.dart';
import 'l10n/strings.dart' as l10n;
import 'models/note_model.dart' show AppLocale;
import 'models/window_args.dart';
// Deferred imports to save memory in multi-window scenarios
import 'pages/panel/panel_page.dart' deferred as panel_impl;
import 'pages/overlay/overlay_page.dart' deferred as overlay_impl;
import 'pages/note_window/note_window_page.dart';
import 'services/hotkey_service.dart';
import 'services/tray_service.dart';
import 'services/panel_preferences.dart';
import 'services/window_message_service.dart';
import 'services/log_service.dart';
import 'services/panel_visibility_service.dart';
import 'services/panel_window_service.dart';
import 'theme/app_theme.dart';
import 'controllers/ipc_scope.dart';

import 'utils/single_instance.dart';

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

void main(List<String> args) async {
  runZonedGuarded(
    () async {
      WidgetsFlutterBinding.ensureInitialized();
      await LogService.instance.init();
      await LogService.info('Starting App with args: $args, PID: $pid');

      final windowController = await WindowController.fromCurrentEngine();
      final windowArgs = WindowArgs.fromJsonString(windowController.arguments);
      final appConfig = AppConfig.fromWindowArgs(windowArgs);
      await LogService.info('AppConfig mode: ${appConfig.mode}');

      // Single Instance Check (Only for Main Process)
      if (appConfig.mode == AppMode.normal) {
        final isPrimary = await SingleInstance.ensure(
          onActivate: () async {
            await LogService.info('SingleInstance: Activated by new instance');
            await PanelWindowService.show();
          },
        );
        if (!isPrimary) {
          await LogService.info('SingleInstance: Secondary instance, exiting');
          exit(0);
        }
      }

      // Pre-load deferred libraries based on mode
      if (appConfig.mode == AppMode.normal) {
        await panel_impl.loadLibrary();
      } else if (appConfig.mode == AppMode.overlay) {
        await overlay_impl.loadLibrary();
      }

      final locale = await PanelPreferences.getLanguage();
      final showPanelOnStartup = await PanelPreferences.getShowPanelOnStartup();
      final localeController = LocaleController(locale);
      final scope = switch (appConfig.mode) {
        AppMode.note => IpcScope.note(appConfig.noteId ?? ''),
        AppMode.overlay => IpcScope.overlay(appConfig.layer.name),
        _ => IpcScope.panel,
      };
      await WindowMessageService(localeController, scope: scope).start();
      if (appConfig.mode == AppMode.normal) {
        await LogService.info(
          'Setting Panel Window ID: ${windowController.windowId}',
        );
        await PanelPreferences.setPanelWindowId(
          windowController.windowId.toString(),
        );
      }

      // 1. Window Manager Init
      await LogService.info('Initializing WindowManager');
      await windowManager.ensureInitialized();

      WindowOptions windowOptions = const WindowOptions(
        size: Size(360, 500),
        center: true,
        backgroundColor: Colors.transparent,
        skipTaskbar: true,
        titleBarStyle: TitleBarStyle.hidden,
      );

      await windowManager.waitUntilReadyToShow(windowOptions, () async {
        await LogService.info('WindowManager ready to show');
        if (appConfig.mode == AppMode.normal) {
          if (!showPanelOnStartup) {
            await PanelWindowService.ensureHidden();
            await LogService.info('Panel Window Hidden (Startup Preference)');
          } else {
            await PanelWindowService.show(focus: false);
            await LogService.info('Panel Window Shown (Startup Preference)');
          }
        }
        await windowManager.setMaximizable(false);
      });

      // 2. Services Init
      if (appConfig.mode == AppMode.normal) {
        try {
          await LogService.info('Initializing TrayService');
          await TrayService().init(localeController: localeController);
          await LogService.info('TrayService initialized');
        } catch (e, s) {
          await LogService.error('TrayService init error: $e\n$s');
        }

        try {
          await LogService.info('Initializing HotkeyService');
          await HotkeyService.instance.init();
          await LogService.info('HotkeyService initialized');
        } catch (e, s) {
          await LogService.error('HotkeyService init error: $e\n$s');
        }
      }

      runApp(MyApp(localeController: localeController));
      if (appConfig.mode == AppMode.normal) {
        await PanelVisibilityService.applyStartupVisibility(
          showOnStartup: showPanelOnStartup,
        );
      }
    },
    (error, stack) {
      LogService.error('Uncaught error', error, stack);
    },
  );
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
              ? overlay_impl.OverlayPage(strings: strings)
              : AppConfig.instance.isNoteWindow
              ? NoteWindowPage(
                  noteId: AppConfig.instance.noteId ?? '',
                  strings: strings,
                )
              : panel_impl.PanelPage(
                  localeController: localeController,
                  strings: strings,
                ),
          onGenerateRoute: (settings) {
            // Keep route name stable without referencing deferred symbols.
            if (settings.name == '/overlay') {
              // Fallback/Safety check if needed, though usually handled by home
              return MaterialPageRoute<void>(
                builder: (_) => overlay_impl.OverlayPage(strings: strings),
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
