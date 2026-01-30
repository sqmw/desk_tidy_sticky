// ignore_for_file: use_build_context_synchronously

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:window_manager/window_manager.dart';
import 'package:win32/win32.dart' as win32;

import '../../config/app_config.dart';
import '../../controllers/ipc_controller.dart';
import '../../controllers/overlay_controller.dart';
import '../../l10n/strings.dart';
import '../../models/note_model.dart';
import '../../services/ipc_service.dart';
import '../../services/notes_service.dart';
import '../../services/workerw_service.dart';
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
  Strings get strings => widget.strings ?? Strings.of(AppLocale.en);
  final OverlayController _overlayController = OverlayController.instance;
  final IpcController _ipcController = IpcController.instance;

  bool _clickThrough = false;
  bool? _previousAlwaysOnTop;
  List<Note> _pinned = [];
  final Map<String, Offset> _positions = {};
  Rect _virtualRect = const Rect.fromLTWH(0, 0, 1920, 1080);

  static const Size _panelDefaultSize = Size(360, 500);

  @override
  void initState() {
    super.initState();
    print(
      '[OverlayPage] initState. isOverlay: ${AppConfig.instance.isOverlay}, monitor: ${AppConfig.instance.monitorRectArg}',
    );
    windowManager.addListener(this);
    _overlayController.clickThrough.addListener(_handleClickThroughChanged);
    _ipcController.refreshTick.addListener(_handleIpcRefresh);
    _ipcController.closeTick.addListener(_handleIpcClose);
    _prepareWindow();
    _refreshPinned();
  }

  @override
  void dispose() {
    windowManager.removeListener(this);
    _overlayController.clickThrough.removeListener(_handleClickThroughChanged);
    _ipcController.refreshTick.removeListener(_handleIpcRefresh);
    _ipcController.closeTick.removeListener(_handleIpcClose);
    _restoreWindow();
    super.dispose();
  }

  Future<void> _prepareWindow() async {
    _clickThrough = _overlayController.clickThrough.value;
    _virtualRect = _getOverlayRect();
    _previousAlwaysOnTop ??= await windowManager.isAlwaysOnTop();
    // Do NOT set Topmost initially to avoid covering the main window
    // await windowManager.setAlwaysOnTop(true);
    await windowManager.setSkipTaskbar(true);
    await windowManager.setAsFrameless();
    await windowManager.setBackgroundColor(Colors.transparent);
    await windowManager.setHasShadow(false);
    await windowManager.setIgnoreMouseEvents(_clickThrough);
    await windowManager.setSize(_virtualRect.size);
    print(
      '[OverlayPage] _prepareWindow: setting position to ${_virtualRect.topLeft}',
    );
    await windowManager.setPosition(_virtualRect.topLeft);

    // Ensure we are at the bottom Z-order before showing
    await windowManager.setAlwaysOnTop(false);

    print('[OverlayPage] _prepareWindow: show and focus');
    await windowManager.show();
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
      // Overlay-only process: exit completely.
      // ignore: avoid_exit
      exit(0);
    } else {
      Navigator.of(context).maybePop();
    }
  }

  Future<void> _restoreWindow() async {
    await windowManager.setAlwaysOnTop(_previousAlwaysOnTop ?? false);
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
    await windowManager.setIgnoreMouseEvents(value);

    if (value) {
      // Click-through: Drop to bottom
      await windowManager.setAlwaysOnTop(false);
    } else {
      // Interactive: Raise to top
      await windowManager.setAlwaysOnTop(true);
    }

    // Force Windows to refresh hit-testing.
    // We only call show() to refresh the window style/Z-order.
    // We DO NOT call focus() here because it steals focus from the Main Panel,
    // which then gets blocked by this full-screen overlay.
    await windowManager.show();
  }

  Offset _fallbackPosition(int index) {
    final dx = _virtualRect.left + 24 + (index % 3) * 260;
    final dy = _virtualRect.top + 72 + (index ~/ 3) * 180;
    return Offset(dx.toDouble(), dy.toDouble());
  }

  Future<void> _refreshPinned() async {
    await _notesService.loadNotes();
    final pinned = List<Note>.from(_notesService.pinnedNotes);
    setState(() {
      _pinned = pinned;
      for (final entry in pinned.asMap().entries) {
        final note = entry.value;
        _positions[note.id] = Offset(
          note.x ?? _fallbackPosition(entry.key).dx,
          note.y ?? _fallbackPosition(entry.key).dy,
        );
      }
    });
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
    await _notesService.updateNote(note.copyWith(x: pos.dx, y: pos.dy));
    await _refreshPinned();

    // Notify parent to refresh list (e.g. if position was relevant, or just keep in sync)
    // Position might not affect list view, but good practice.
    IpcService.instance.sendToParent('refresh_notes');
  }

  Future<void> _editNote(Note note) async {
    if (_clickThrough) {
      setState(() => _clickThrough = false);
      await windowManager.setIgnoreMouseEvents(false);
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
    await _notesService.updateNote(note.copyWith(text: newText));
    await _refreshPinned();
    IpcService.instance.sendToParent('refresh_notes');
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
                child: StickyNoteCard(
                  note: note,
                  onDragUpdate: (delta) => _updateDrag(note, delta),
                  onDragEnd: () => _commitPosition(note),
                  onDelete: () async {
                    await _notesService.deleteNote(note.id);
                    await _refreshPinned();
                    IpcService.instance.sendToParent('refresh_notes');
                  },
                  onDoneToggle: () async {
                    await _notesService.toggleDone(note.id);
                    await _refreshPinned();
                    IpcService.instance.sendToParent('refresh_notes');
                  },
                  onUnpin: () async {
                    await _notesService.togglePin(note.id);
                    await _refreshPinned();
                    IpcService.instance.sendToParent('refresh_notes');
                  },
                  onEdit: () => _editNote(note),
                  strings: strings,
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

  Rect _getVirtualScreenRect() {
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

  Rect _getOverlayRect() {
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
    return _getVirtualScreenRect();
  }
}
