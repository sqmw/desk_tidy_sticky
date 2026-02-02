// ignore_for_file: use_build_context_synchronously

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:window_manager/window_manager.dart';
import 'package:win32/win32.dart' as win32;

import '../../config/app_config.dart';
import '../../controllers/ipc_controller.dart';
import '../../controllers/ipc_scope.dart';
import '../../controllers/overlay_controller.dart';
import '../../l10n/strings.dart';
import '../../models/note_model.dart';
import '../../services/notes_command_dispatcher.dart';
import '../../services/notes_service.dart';
import '../../services/window_zorder_service.dart';
import '../../services/workerw_service.dart';
import '../../widgets/hover_state_builder.dart';
import 'sticky_note_card.dart';

class OverlayPage extends StatefulWidget {
  static const routeName = '/overlay';
  final Strings? strings;
  const OverlayPage({super.key, this.strings});

  @override
  State<OverlayPage> createState() => _OverlayPageState();
}

class _OverlayPageState extends State<OverlayPage> with WindowListener {
  final NotesService _notesService = NotesService();
  final NotesCommandDispatcher _notesDispatcher =
      NotesCommandDispatcher.instance;
  Strings get strings => widget.strings ?? Strings.of(AppLocale.en);
  final OverlayController _overlayController = OverlayController.instance;
  final IpcController _ipcController = IpcController.instance;
  late final String _ipcScope;

  bool _clickThrough = false;
  bool? _previousAlwaysOnTop;
  bool _hasNotes = false;
  List<Note> _pinned = [];
  final Map<String, Offset> _positions = {};
  Rect _virtualRect = const Rect.fromLTWH(0, 0, 1920, 1080);
  double _devicePixelRatio = 1.0;
  int _bottomSettleEpoch = 0;

  static const Size _panelDefaultSize = Size(360, 500);

  @override
  void initState() {
    super.initState();
    print(
      '[OverlayPage] initState. isOverlay: ${AppConfig.instance.isOverlay}, monitor: ${AppConfig.instance.monitorRectArg}',
    );
    windowManager.addListener(this);
    _ipcScope = IpcScope.overlay(AppConfig.instance.layer.name);
    _overlayController.clickThrough.addListener(_handleClickThroughChanged);
    _ipcController.refreshTick(_ipcScope).addListener(_handleIpcRefresh);
    _ipcController.closeTick(_ipcScope).addListener(_handleIpcClose);
    _prepareWindow();
    _refreshPinned();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _updateDevicePixelRatio();
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _updateDevicePixelRatio();
  }

  void _updateDevicePixelRatio() {
    final next = View.of(context).devicePixelRatio;
    if ((_devicePixelRatio - next).abs() < 0.001) return;
    _devicePixelRatio = next;
    _applyOverlayBounds();
    _refreshPinned();
  }

  @override
  void dispose() {
    windowManager.removeListener(this);
    _overlayController.clickThrough.removeListener(_handleClickThroughChanged);
    _ipcController.refreshTick(_ipcScope).removeListener(_handleIpcRefresh);
    _ipcController.closeTick(_ipcScope).removeListener(_handleIpcClose);
    _restoreWindow();
    super.dispose();
  }

  Future<void> _prepareWindow() async {
    _clickThrough = _overlayController.clickThrough.value;
    _virtualRect = _getOverlayRectLogical();
    _previousAlwaysOnTop ??= await windowManager.isAlwaysOnTop();
    // Do NOT set Topmost initially to avoid covering the main window
    // await windowManager.setAlwaysOnTop(true);
    await windowManager.setSkipTaskbar(true);
    await windowManager.setAsFrameless();
    await windowManager.setBackgroundColor(Colors.transparent);
    await windowManager.setHasShadow(false);
    await windowManager.setIgnoreMouseEvents(_effectiveClickThrough);
    await _applyOverlayBounds();
    print(
      '[OverlayPage] _prepareWindow: setting position to ${_virtualRect.topLeft}',
    );

    // Ensure we are at the bottom Z-order before showing
    await WindowZOrderService.setAlwaysOnTopNoActivate(false);

    print('[OverlayPage] _prepareWindow: show and focus');
    await WindowZOrderService.showNoActivate();
    // await windowManager.focus(); // Avoid stealing focus/raising if possible

    if (AppConfig.instance.embedWorkerW) {
      final hwnd = await windowManager.getId();
      final attached = WorkerWService.attachToWorkerW(hwnd);
      print('[OverlayPage] _prepareWindow: embedWorkerW attached: $attached');
    }
  }

  void _handleIpcRefresh() {
    _refreshPinned();
  }

  void _handleIpcClose() async {
    _overlayController.setClickThrough(false);
    await _restoreWindow();
    if (!mounted) return;
    if (AppConfig.instance.isOverlay) {
      await windowManager.close();
    } else {
      Navigator.of(context).maybePop();
    }
  }

  Future<void> _restoreWindow() async {
    await WindowZOrderService.setAlwaysOnTopNoActivate(
      _previousAlwaysOnTop ?? false,
    );
    await windowManager.setIgnoreMouseEvents(false);
    await windowManager.setHasShadow(true);
    if (!AppConfig.instance.isOverlay) {
      await windowManager.setSize(_panelDefaultSize);
      await windowManager.center();
    }
  }

  void _handleClickThroughChanged() async {
    final value = _overlayController.clickThrough.value;
    if (!mounted) return;
    setState(() {
      _clickThrough = value;
    });
    if (!_effectiveClickThrough) {
      _cancelBottomSettle();
    }
    await _refreshPinned();
    await _applyMouseMode();

    // Force Windows to refresh hit-testing.
    // We only call show() to refresh the window style/Z-order.
    // We DO NOT call focus() here because it steals focus from the Main Panel,
    // which then gets blocked by this full-screen overlay.
    await WindowZOrderService.showNoActivate();
  }

  Future<void> _updateWindowZOrder() async {
    final interactive = !_effectiveClickThrough;

    // Single overlay window per monitor:
    // - Interactive mode must raise window to allow editing.
    // - If any note is always-on-top, keep the overlay window topmost.
    // - Otherwise, push window behind desktop (WorkerW) and to HWND_BOTTOM.
    final anyAlwaysOnTop = _pinned.any((n) => n.isAlwaysOnTop);
    final shouldBeTop = interactive || anyAlwaysOnTop;

    print(
      '[OverlayPage] _updateWindowZOrder: interactive=$interactive, anyOnTop=$anyAlwaysOnTop -> shouldBeTop=$shouldBeTop',
    );

    final hwnd = await windowManager.getId();
    _previousAlwaysOnTop = shouldBeTop;

    bool reparented = false;
    if (shouldBeTop) {
      if (AppConfig.instance.embedWorkerW) {
        reparented = WorkerWService.detachFromWorkerW(hwnd);
      }
      await WindowZOrderService.setAlwaysOnTopNoActivate(true);
    } else {
      await WindowZOrderService.setAlwaysOnTopNoActivate(false);
      if (AppConfig.instance.embedWorkerW) {
        reparented = WorkerWService.attachToWorkerW(hwnd);
        if (!reparented) {
          await WindowZOrderService.setBottomNoActivate();
        }
      } else {
        await WindowZOrderService.setBottomNoActivate();
      }
    }
    if (reparented || AppConfig.instance.embedWorkerW) {
      await _applyOverlayBounds();
    }
    await WindowZOrderService.showNoActivate();
    if (!shouldBeTop) {
      await WindowZOrderService.setBottomNoActivate();
      _scheduleBottomSettle();
    }
  }

  bool get _effectiveClickThrough => _clickThrough || _pinned.isEmpty;

  Future<void> _applyMouseMode() async {
    if (!_hasNotes) {
      await windowManager.setIgnoreMouseEvents(true);
      return;
    }
    await windowManager.setIgnoreMouseEvents(_effectiveClickThrough);
    await _updateWindowZOrder();
  }

  Future<void> _syncVisibility() async {
    if (_hasNotes) {
      await _applyOverlayBounds();
      await WindowZOrderService.showNoActivate();
    } else {
      await windowManager.hide();
    }
  }

  Future<void> _applyOverlayBounds() async {
    _virtualRect = _getOverlayRectLogical();
    await windowManager.setBounds(
      Rect.fromLTWH(
        _virtualRect.left,
        _virtualRect.top,
        _virtualRect.width,
        _virtualRect.height,
      ),
    );
    if (Platform.isWindows) {
      final size = await windowManager.getSize();
      await windowManager.setSize(Size(size.width + 1, size.height + 1));
      await windowManager.setSize(size);
    }
  }

  Offset _fallbackPosition(int index) {
    final dx = _virtualRect.left + 24 + (index % 3) * 260;
    final dy = _virtualRect.top + 72 + (index ~/ 3) * 180;
    return Offset(dx.toDouble(), dy.toDouble());
  }

  Future<void> _refreshPinned() async {
    await _notesService.loadNotes();
    final allPinned = List<Note>.from(_notesService.pinnedNotes);
    final pendingMigrations = <(String, Offset)>[];
    final filtered = allPinned;

    setState(() {
      _pinned = filtered;
      _hasNotes = filtered.isNotEmpty;
      if (filtered.isEmpty) {
        _positions.clear();
      }
      for (final note in filtered) {
        // Use global index among all pinned notes for fallback position consistency
        final globalIndex = allPinned.indexWhere((n) => n.id == note.id);

        print(
          '[OverlayPage] Note ${note.id}: isAlwaysOnTop=${note.isAlwaysOnTop}, pos=(${note.x}, ${note.y}) globalIndex=$globalIndex',
        );
        final pos = _normalizeStoredPosition(note, globalIndex);
        if (pos.needsPersist) {
          pendingMigrations.add((note.id, pos.value));
        }
        _positions[note.id] = pos.value;
      }
    });
    for (final item in pendingMigrations) {
      await _notesDispatcher.updatePosition(
        item.$1,
        x: item.$2.dx,
        y: item.$2.dy,
      );
    }
    await _syncVisibility();
    await _applyMouseMode();
  }

  ({Offset value, bool needsPersist}) _normalizeStoredPosition(
    Note note,
    int globalIndex,
  ) {
    final fallback = _fallbackPosition(globalIndex);
    final x = note.x;
    final y = note.y;
    if (x == null || y == null) {
      return (value: fallback, needsPersist: false);
    }
    if (_devicePixelRatio <= 1.0) {
      return (value: Offset(x, y), needsPersist: false);
    }
    final maxX = _virtualRect.width + 8;
    final maxY = _virtualRect.height + 8;
    final likelyPhysical = x > maxX || y > maxY;
    if (!likelyPhysical) {
      return (value: Offset(x, y), needsPersist: false);
    }
    final scaled = Offset(x / _devicePixelRatio, y / _devicePixelRatio);
    return (value: scaled, needsPersist: true);
  }

  void _updateDrag(Note note, Offset delta) {
    final base = _positions[note.id] ?? _fallbackPosition(0);
    final next = Offset(base.dx + delta.dx, base.dy + delta.dy);
    _positions[note.id] = _clampToViewport(next);
    setState(() {});
  }

  Future<void> _commitPosition(Note note) async {
    final pos = _positions[note.id];
    if (pos == null) return;
    await _notesDispatcher.updatePosition(note.id, x: pos.dx, y: pos.dy);
  }

  Future<void> _editNote(Note note) async {
    if (_clickThrough) {
      _overlayController.setClickThrough(false);
      await _applyMouseMode();
    }

    if (!mounted) return;
    final controller = TextEditingController(text: note.text);
    final newText = await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(strings.edit),
          content: TextField(
            controller: controller,
            autofocus: true,
            minLines: 1,
            maxLines: 8,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(strings.cancel),
            ),
            FilledButton(
              onPressed: () =>
                  Navigator.of(context).pop(controller.text.trim()),
              child: Text(strings.saveNote),
            ),
          ],
        );
      },
    );
    if (!mounted) return;
    if (newText == null || newText.isEmpty) return;
    await _notesDispatcher.updateText(note.id, newText);
    setState(() {
      _pinned = _pinned
          .map((n) => n.id == note.id ? n.copyWith(text: newText) : n)
          .toList(growable: false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return KeyboardListener(
      autofocus: true,
      focusNode: FocusNode(),
      onKeyEvent: (event) async {
        if (event is KeyDownEvent &&
            event.logicalKey == LogicalKeyboardKey.escape) {
          _overlayController.setClickThrough(false);
        }
      },
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Stack(
          children: [
            ..._pinned.map((note) {
              final pos = _positions[note.id] ?? _fallbackPosition(0);
              final clamped = _clampToViewport(pos);
              _positions[note.id] = clamped;
              return Positioned(
                left: clamped.dx,
                top: clamped.dy,
                child: HoverStateBuilder(
                  enabled: !_clickThrough,
                  builder: (context, hovering) {
                    return StickyNoteCard(
                      note: note,
                      onDragUpdate: (delta) => _updateDrag(note, delta),
                      onDragEnd: () => _commitPosition(note),
                      onDelete: () async {
                        await _notesDispatcher.deleteNote(note.id);
                        setState(() {
                          _pinned = _pinned
                              .where((n) => n.id != note.id)
                              .toList(growable: false);
                          _positions.remove(note.id);
                          _hasNotes = _pinned.isNotEmpty;
                        });
                        await _syncVisibility();
                      },
                      onDoneToggle: () async {
                        await _notesDispatcher.toggleDone(note.id);
                        setState(() {
                          _pinned = _pinned
                              .map(
                                (n) => n.id == note.id
                                    ? n.copyWith(isDone: !n.isDone)
                                    : n,
                              )
                              .toList(growable: false);
                        });
                      },
                      onUnpin: () async {
                        await _notesDispatcher.togglePin(note.id);
                        setState(() {
                          _pinned = _pinned
                              .where((n) => n.id != note.id)
                              .toList(growable: false);
                          _positions.remove(note.id);
                          _hasNotes = _pinned.isNotEmpty;
                        });
                        await _syncVisibility();
                      },
                      onToggleZOrder: () async {
                        await _notesDispatcher.toggleZOrder(note.id);
                        setState(() {
                          _pinned = _pinned
                              .map(
                                (n) => n.id == note.id
                                    ? n.copyWith(
                                        isAlwaysOnTop: !n.isAlwaysOnTop,
                                      )
                                    : n,
                              )
                              .toList(growable: false);
                        });
                        await _updateWindowZOrder();
                      },
                      onEdit: () => _editNote(note),
                      onSave: () {},
                      onCancel: () {},
                      strings: strings,
                      actionsVisible: hovering,
                    );
                  },
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Offset _clampToViewport(Offset offset) {
    final minX = _virtualRect.left + 4;
    final minY = _virtualRect.top + 4;
    final maxX = _virtualRect.right - 220; // card width estimate
    final maxY = _virtualRect.bottom - 160; // card height estimate
    return Offset(offset.dx.clamp(minX, maxX), offset.dy.clamp(minY, maxY));
  }

  Rect _getVirtualScreenRectPhysical() {
    final left = win32.GetSystemMetrics(win32.SM_XVIRTUALSCREEN);
    final top = win32.GetSystemMetrics(win32.SM_YVIRTUALSCREEN);
    final width = win32.GetSystemMetrics(win32.SM_CXVIRTUALSCREEN);
    final height = win32.GetSystemMetrics(win32.SM_CYVIRTUALSCREEN);

    // Leave space for taskbar (best-effort). For left/top taskbar layouts,
    // use click-through toggle to access tray if needed.
    const taskbarMargin = 80.0;
    final adjustedHeight = (height - taskbarMargin).clamp(200, height);

    return Rect.fromLTWH(
      left.toDouble(),
      top.toDouble(),
      width.toDouble(),
      adjustedHeight.toDouble(),
    );
  }

  Rect _getOverlayRectPhysical() {
    final m = AppConfig.instance.overlayMonitorRect;
    if (m != null) {
      // monitor rect might include negative origins.
      return Rect.fromLTWH(
        m.left.toDouble(),
        m.top.toDouble(),
        m.width.toDouble(),
        m.height.toDouble(),
      );
    }
    return _getVirtualScreenRectPhysical();
  }

  Rect _getOverlayRectLogical() {
    return _toLogicalRect(_getOverlayRectPhysical());
  }

  Rect _toLogicalRect(Rect rect) {
    final dpr = _devicePixelRatio == 0 ? 1.0 : _devicePixelRatio;
    return Rect.fromLTWH(
      rect.left / dpr,
      rect.top / dpr,
      rect.width / dpr,
      rect.height / dpr,
    );
  }

  void _scheduleBottomSettle() {
    if (!_effectiveClickThrough) return;
    final epoch = ++_bottomSettleEpoch;
    Future.delayed(const Duration(milliseconds: 120), () async {
      if (!mounted || _bottomSettleEpoch != epoch) return;
      await _enforceBottomLayer();
    });
    Future.delayed(const Duration(milliseconds: 360), () async {
      if (!mounted || _bottomSettleEpoch != epoch) return;
      await _enforceBottomLayer();
    });
  }

  Future<void> _enforceBottomLayer() async {
    if (!_effectiveClickThrough) return;
    if (AppConfig.instance.embedWorkerW) {
      final hwnd = await windowManager.getId();
      WorkerWService.attachToWorkerW(hwnd);
    }
    await WindowZOrderService.setBottomNoActivate();
  }

  void _cancelBottomSettle() {
    _bottomSettleEpoch++;
  }
}
