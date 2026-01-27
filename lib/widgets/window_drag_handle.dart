import 'dart:ffi';

import 'package:flutter/widgets.dart';
import 'package:window_manager/window_manager.dart';
import 'package:win32/win32.dart' as win32;
import 'package:ffi/ffi.dart';

/// Manual window dragging avoids Windows Aero Snap because it does not enter
/// the native SC_MOVE loop.
class WindowDragHandle extends StatefulWidget {
  final Widget child;

  const WindowDragHandle({super.key, required this.child});

  @override
  State<WindowDragHandle> createState() => _WindowDragHandleState();
}

class _WindowDragHandleState extends State<WindowDragHandle> {
  int? _hwnd;
  Offset? _windowStart;
  Offset? _cursorStart;
  Offset? _cursorLatest;
  bool _frameScheduled = false;

  @override
  void initState() {
    super.initState();
    _initHwnd();
  }

  Future<void> _initHwnd() async {
    final hwnd = await windowManager.getId();
    if (!mounted) return;
    _hwnd = hwnd;
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onPanStart: (details) {
        final hwnd = _hwnd;
        if (hwnd == null) return;
        _windowStart = _getWindowTopLeft(hwnd);
        _cursorStart = _getCursorPos();
        _cursorLatest = _cursorStart;
        _scheduleMove();
      },
      onPanUpdate: (details) {
        _cursorLatest = _getCursorPos();
        _scheduleMove();
        _scheduleMove();
      },
      onPanEnd: (_) {
        _hwnd = null;
        _cursorStart = null;
        _cursorLatest = null;
        _frameScheduled = false;
      },
      onPanCancel: () {
        _hwnd = null;
        _cursorStart = null;
        _cursorLatest = null;
        _frameScheduled = false;
      },
      child: widget.child,
    );
  }

  void _scheduleMove() {
    if (_frameScheduled) return;
    _frameScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _frameScheduled = false;
      final hwnd = _hwnd;
      final base = _windowStart;
      final cursorStart = _cursorStart;
      final cursorNow = _cursorLatest;
      if (hwnd == null || base == null || cursorStart == null || cursorNow == null) {
        return;
      }
      final delta = cursorNow - cursorStart;
      final next = base + delta;
      win32.SetWindowPos(
        hwnd,
        0,
        next.dx.toInt(),
        next.dy.toInt(),
        0,
        0,
        win32.SWP_NOSIZE | win32.SWP_NOZORDER | win32.SWP_NOACTIVATE,
      );
    });
  }

  Offset _getCursorPos() {
    final point = calloc<win32.POINT>();
    try {
      win32.GetCursorPos(point);
      return Offset(point.ref.x.toDouble(), point.ref.y.toDouble());
    } finally {
      calloc.free(point);
    }
  }

  Offset _getWindowTopLeft(int hwnd) {
    final rect = calloc<win32.RECT>();
    try {
      win32.GetWindowRect(hwnd, rect);
      return Offset(rect.ref.left.toDouble(), rect.ref.top.toDouble());
    } finally {
      calloc.free(rect);
    }
  }
}
