import 'dart:convert';

import 'overlay_layer.dart';

enum AppWindowType { panel, overlay }

class WindowArgs {
  final AppWindowType type;
  final OverlayLayer layer;
  final String? monitorRectArg;
  final bool embedWorkerW;

  const WindowArgs({
    required this.type,
    this.layer = OverlayLayer.any,
    this.monitorRectArg,
    this.embedWorkerW = false,
  });

  const WindowArgs.panel()
    : type = AppWindowType.panel,
      layer = OverlayLayer.any,
      monitorRectArg = null,
      embedWorkerW = false;

  const WindowArgs.overlay({
    required this.layer,
    required this.monitorRectArg,
    required this.embedWorkerW,
  }) : type = AppWindowType.overlay;

  static WindowArgs fromJsonString(String? raw) {
    if (raw == null || raw.trim().isEmpty) {
      return const WindowArgs.panel();
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return const WindowArgs.panel();
      final typeRaw = decoded['type'];
      final type = typeRaw == 'overlay'
          ? AppWindowType.overlay
          : AppWindowType.panel;
      if (type == AppWindowType.panel) {
        return const WindowArgs.panel();
      }
      final layerRaw = decoded['layer'];
      final layer = switch (layerRaw) {
        'top' => OverlayLayer.top,
        'bottom' => OverlayLayer.bottom,
        _ => OverlayLayer.any,
      };
      final rectArg = decoded['monitorRectArg'] as String?;
      final embedWorkerW = decoded['embedWorkerW'] == true;
      return WindowArgs.overlay(
        layer: layer,
        monitorRectArg: rectArg,
        embedWorkerW: embedWorkerW,
      );
    } catch (_) {
      return const WindowArgs.panel();
    }
  }

  String toJsonString() {
    final map = <String, Object?>{
      'type': type == AppWindowType.overlay ? 'overlay' : 'panel',
      'layer': layer.name,
      'monitorRectArg': monitorRectArg,
      'embedWorkerW': embedWorkerW,
    };
    return jsonEncode(map);
  }
}
