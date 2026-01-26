import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';
import 'pages/panel/panel_page.dart';
import 'pages/overlay/overlay_page.dart';
import 'services/hotkey_service.dart';
import 'services/tray_service.dart';

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

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
    // Start hidden, let hotkey/tray show it
    await windowManager.hide();
  });

  // 2. Services Init
  await TrayService().init();
  await HotkeyService.instance.init();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Desk Tidy Sticky',
      debugShowCheckedModeBanner: false,
      navigatorKey: appNavigatorKey,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.amber),
        useMaterial3: true,
        fontFamily: 'Segoe UI', // Good for Windows
      ),
      home: const PanelPage(),
      onGenerateRoute: (settings) {
        if (settings.name == OverlayPage.routeName) {
          return MaterialPageRoute<void>(
            builder: (_) => const OverlayPage(),
            settings: settings,
            fullscreenDialog: true,
          );
        }
        return null;
      },
    );
  }
}
