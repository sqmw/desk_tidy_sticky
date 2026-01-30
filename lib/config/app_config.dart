import 'dart:io';

import '../models/monitor_rect.dart';
import '../models/overlay_layer.dart';
import '../models/window_args.dart';

class AppConfig {
  AppConfig._({
    required this.mode,
    required this.embedWorkerW,
    required this.isChild,
    required this.parentPid,
    required this.monitorRectArg,
    required this.layer,
  });

  static AppConfig? _instance;

  static AppConfig get instance => _instance ?? AppConfig._default();

  static AppConfig _default() => AppConfig._(
    mode: AppMode.normal,
    embedWorkerW: false,
    isChild: false,
    parentPid: null,
    monitorRectArg: null,
    layer: OverlayLayer.any,
  );

  final AppMode mode;
  final bool embedWorkerW;
  final bool isChild;
  final int? parentPid;
  final String? monitorRectArg;
  final OverlayLayer layer;

  bool get isBackground => mode == AppMode.background;
  bool get isOverlay => mode == AppMode.overlay;

  MonitorRect? get overlayMonitorRect {
    final arg = monitorRectArg;
    if (arg == null || arg.trim().isEmpty) return null;
    // Overlay child may not care about monitorId, so use 0 by default.
    return MonitorRect.fromArg(arg, monitorId: 0);
  }

  static AppConfig fromArgs(List<String> args) {
    AppMode mode = AppMode.normal;
    bool embedWorkerW = false;
    bool isChild = false;
    int? parentPid;
    String? monitorRectArg;
    OverlayLayer layer = OverlayLayer.any;

    for (final arg in args) {
      if (arg == '--background' || arg == '--mode=background') {
        mode = AppMode.background;
      } else if (arg == '--overlay' || arg == '--mode=overlay') {
        mode = AppMode.overlay;
      } else if (arg == '--embed-workerw') {
        embedWorkerW = true;
      } else if (arg == '--child') {
        isChild = true;
      } else if (arg.startsWith('--parent-pid=')) {
        parentPid = int.tryParse(arg.substring('--parent-pid='.length));
      } else if (arg.startsWith('--monitor-rect=')) {
        monitorRectArg = arg.substring('--monitor-rect='.length);
      } else if (arg.startsWith('--layer=')) {
        final val = arg.substring('--layer='.length);
        if (val == 'top') layer = OverlayLayer.top;
        if (val == 'bottom') layer = OverlayLayer.bottom;
      }
    }

    print('[AppConfig] fromArgs: mode=$mode, layer=$layer, args=$args');

    final config = AppConfig._(
      mode: mode,
      embedWorkerW: embedWorkerW,
      isChild: isChild,
      parentPid: parentPid,
      monitorRectArg: monitorRectArg,
      layer: layer,
    );
    _instance = config;
    return config;
  }

  static AppConfig initFromProcess() {
    return fromArgs(Platform.executableArguments);
  }

  static AppConfig fromWindowArgs(WindowArgs args) {
    final mode =
        args.type == AppWindowType.overlay ? AppMode.overlay : AppMode.normal;
    final config = AppConfig._(
      mode: mode,
      embedWorkerW: args.embedWorkerW,
      isChild: false,
      parentPid: null,
      monitorRectArg: args.monitorRectArg,
      layer: args.layer,
    );
    _instance = config;
    return config;
  }
}

enum AppMode { normal, background, overlay }
