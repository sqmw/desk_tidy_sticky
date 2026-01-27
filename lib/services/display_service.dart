import 'dart:ffi';

import 'package:win32/win32.dart' as win32;

import '../models/monitor_rect.dart';

class DisplayService {
  DisplayService._();

  static final List<MonitorRect> _monitors = [];

  static List<MonitorRect> getMonitors() {
    _monitors.clear();

    final callback = Pointer.fromFunction<win32.MONITORENUMPROC>(
      _enumMonitorProc,
      1,
    );
    win32.EnumDisplayMonitors(0, nullptr, callback, 0);

    // Deterministic order: left->right, top->bottom.
    _monitors.sort((a, b) {
      final x = a.left.compareTo(b.left);
      if (x != 0) return x;
      return a.top.compareTo(b.top);
    });

    return List<MonitorRect>.unmodifiable(_monitors);
  }

  static int _enumMonitorProc(
    int hMonitor,
    int hdcMonitor,
    Pointer lpRect,
    int dwData,
  ) {
    final r = lpRect.cast<win32.RECT>().ref;
    final width = r.right - r.left;
    final height = r.bottom - r.top;
    if (width > 0 && height > 0) {
      _monitors.add(
        MonitorRect(
          monitorId: hMonitor,
          left: r.left,
          top: r.top,
          width: width,
          height: height,
        ),
      );
    }
    return 1;
  }
}
