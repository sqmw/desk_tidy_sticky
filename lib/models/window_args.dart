import 'dart:convert';

import 'overlay_layer.dart';

enum AppWindowType { panel, overlay, note }

class WindowArgs {
  final AppWindowType type;
  final OverlayLayer layer;
  final String? monitorRectArg;
  final bool embedWorkerW;
  final String? noteId;

  const WindowArgs({
    required this.type,
    this.layer = OverlayLayer.any,
    this.monitorRectArg,
    this.embedWorkerW = false,
    this.noteId,
  });

  const WindowArgs.panel()
    : type = AppWindowType.panel,
      layer = OverlayLayer.any,
      monitorRectArg = null,
      embedWorkerW = false,
      noteId = null;

  const WindowArgs.overlay({
    required this.layer,
    required this.monitorRectArg,
    required this.embedWorkerW,
  }) : type = AppWindowType.overlay,
       noteId = null;

  const WindowArgs.note({
    required this.noteId,
    this.monitorRectArg,
    required this.embedWorkerW,
  }) : type = AppWindowType.note,
       layer = OverlayLayer.any;

  static WindowArgs fromJsonString(String? raw) {
    if (raw == null || raw.trim().isEmpty) {
      return const WindowArgs.panel();
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return const WindowArgs.panel();
      final typeRaw = decoded['type'];
      final type = switch (typeRaw) {
        'overlay' => AppWindowType.overlay,
        'note' => AppWindowType.note,
        _ => AppWindowType.panel,
      };
      if (type == AppWindowType.panel) {
        return const WindowArgs.panel();
      }
      if (type == AppWindowType.note) {
        final noteId = decoded['noteId'] as String?;
        if (noteId == null || noteId.trim().isEmpty) {
          return const WindowArgs.panel();
        }
        final rectArg = decoded['monitorRectArg'] as String?;
        final embedWorkerW = decoded['embedWorkerW'] == true;
        return WindowArgs.note(
          noteId: noteId,
          monitorRectArg: rectArg,
          embedWorkerW: embedWorkerW,
        );
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
      'type': type == AppWindowType.overlay
          ? 'overlay'
          : type == AppWindowType.note
          ? 'note'
          : 'panel',
      'layer': layer.name,
      'monitorRectArg': monitorRectArg,
      'embedWorkerW': embedWorkerW,
      'noteId': noteId,
    };
    return jsonEncode(map);
  }
}
