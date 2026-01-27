import 'dart:io';

class AppConfig {
  AppConfig._({required this.mode, required this.embedWorkerW});

  static AppConfig? _instance;

  static AppConfig get instance => _instance ?? AppConfig._default();

  static AppConfig _default() =>
      AppConfig._(mode: AppMode.normal, embedWorkerW: false);

  final AppMode mode;
  final bool embedWorkerW;

  bool get isBackground => mode == AppMode.background;
  bool get isOverlay => mode == AppMode.overlay;

  static AppConfig fromArgs(List<String> args) {
    AppMode mode = AppMode.normal;
    bool embedWorkerW = false;

    for (final arg in args) {
      if (arg == '--background' || arg == '--mode=background') {
        mode = AppMode.background;
      } else if (arg == '--overlay' || arg == '--mode=overlay') {
        mode = AppMode.overlay;
      } else if (arg == '--embed-workerw') {
        embedWorkerW = true;
      }
    }

    final config = AppConfig._(mode: mode, embedWorkerW: embedWorkerW);
    _instance = config;
    return config;
  }

  static AppConfig initFromProcess() {
    return fromArgs(Platform.executableArguments);
  }
}

enum AppMode { normal, background, overlay }
