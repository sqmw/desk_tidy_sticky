// ignore_for_file: use_build_context_synchronously

import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:window_manager/window_manager.dart';
import 'package:win32/win32.dart' as win32;

import '../../controllers/ipc_controller.dart';
import '../../controllers/ipc_scope.dart';
import '../../controllers/overlay_controller.dart';
import '../../l10n/strings.dart';
import '../../models/note_model.dart';
import '../../services/notes_service.dart';
import '../../services/window_message_service.dart';
import '../../services/window_zorder_service.dart';
import '../../services/workerw_service.dart';
import '../../services/log_service.dart';
import '../../widgets/hover_state_builder.dart';
import '../../theme/note_card_style.dart';
import '../overlay/sticky_note_card.dart';

class NoteWindowPage extends StatefulWidget {
  const NoteWindowPage({
    super.key,
    required this.noteId,
    required this.strings,
  });

  final String noteId;
  final Strings strings;

  @override
  State<NoteWindowPage> createState() => _NoteWindowPageState();
}

class _NoteWindowPageState extends State<NoteWindowPage> with WindowListener {
  final NotesService _notesService = NotesService();
  final OverlayController _overlayController = OverlayController.instance;
  final IpcController _ipcController = IpcController.instance;
  late final String _ipcScope;

  Note? _note;
  bool _clickThrough = false;
  bool _isEditing = false;
  late final TextEditingController _textController = TextEditingController();

  Timer? _moveDebounce;
  Timer? _alignDebounce;
  Timer? _clampDebounce;
  Offset? _lastSavedPos;
  bool _isClamping = false;

  static const double _cardWidth = 260;
  static const double _cardMinHeight = 60;
  static const EdgeInsets _cardPadding = EdgeInsets.all(12);
  static const double _edgeSnapThreshold = 8;

  double _devicePixelRatio = 1.0;
  Alignment _contentAlignment = Alignment.topCenter;

  @override
  void initState() {
    super.initState();
    LogService.info('[NoteWindow:${widget.noteId}] initState');
    if (widget.noteId.trim().isEmpty) {
      scheduleMicrotask(() => windowManager.close());
      return;
    }
    _ipcScope = IpcScope.note(widget.noteId);
    windowManager.addListener(this);
    _overlayController.clickThrough.addListener(_handleClickThroughChanged);
    _ipcController.refreshTick(_ipcScope).addListener(_handleRefresh);
    _ipcController.closeTick(_ipcScope).addListener(_handleClose);
    _prepareWindow();
    _loadNote();
  }

  @override
  void dispose() {
    LogService.info('[NoteWindow:${widget.noteId}] dispose');
    windowManager.removeListener(this);
    _overlayController.clickThrough.removeListener(_handleClickThroughChanged);
    _ipcController.refreshTick(_ipcScope).removeListener(_handleRefresh);
    _ipcController.closeTick(_ipcScope).removeListener(_handleClose);
    _moveDebounce?.cancel();
    _alignDebounce?.cancel();
    _clampDebounce?.cancel();
    _textController.dispose();
    super.dispose();
  }

  void _updateDevicePixelRatio(BuildContext context) {
    final next = View.of(context).devicePixelRatio;
    if ((_devicePixelRatio - next).abs() < 0.001) return;
    _devicePixelRatio = next;
    _scheduleEdgeAlignmentUpdate();
  }

  Rect _getVirtualScreenRectLogical() {
    if (!Platform.isWindows) {
      // Best-effort fallback (project is Windows-first).
      return const Rect.fromLTWH(0, 0, 1920, 1080);
    }

    final left = win32.GetSystemMetrics(win32.SM_XVIRTUALSCREEN);
    final top = win32.GetSystemMetrics(win32.SM_YVIRTUALSCREEN);
    final width = win32.GetSystemMetrics(win32.SM_CXVIRTUALSCREEN);
    final height = win32.GetSystemMetrics(win32.SM_CYVIRTUALSCREEN);

    final dpr = _devicePixelRatio == 0 ? 1.0 : _devicePixelRatio;
    return Rect.fromLTWH(
      left.toDouble() / dpr,
      top.toDouble() / dpr,
      width.toDouble() / dpr,
      height.toDouble() / dpr,
    );
  }

  void _scheduleEdgeAlignmentUpdate() {
    _alignDebounce?.cancel();
    _alignDebounce = Timer(const Duration(milliseconds: 50), () async {
      if (!mounted) return;
      final pos = await windowManager.getPosition();
      final size = await windowManager.getSize();
      final rect = Rect.fromLTWH(pos.dx, pos.dy, size.width, size.height);
      final screen = _getVirtualScreenRectLogical();

      final nearTop = rect.top <= screen.top + _edgeSnapThreshold;
      final nearBottom = rect.bottom >= screen.bottom - _edgeSnapThreshold;
      final nearLeft = rect.left <= screen.left + _edgeSnapThreshold;
      final nearRight = rect.right >= screen.right - _edgeSnapThreshold;

      final x = nearLeft && !nearRight
          ? -1.0
          : nearRight && !nearLeft
          ? 1.0
          : 0.0;
      // Default keep header-reserved space at bottom (top-aligned content),
      // but when user drags the window to the bottom edge, switch to bottom
      // alignment so the visible content can reach the screen bottom.
      final y = nearTop && !nearBottom
          ? -1.0
          : nearBottom && !nearTop
          ? 1.0
          : -1.0;

      final next = Alignment(x, y);
      if (next == _contentAlignment) return;
      setState(() => _contentAlignment = next);
    });
  }

  Future<void> _clampToScreenIfNeeded() async {
    if (_isClamping) return;
    _isClamping = true;
    try {
      final pos = await windowManager.getPosition();
      final size = await windowManager.getSize();
      final rect = Rect.fromLTWH(pos.dx, pos.dy, size.width, size.height);
      final screen = _getVirtualScreenRectLogical();

      final minX = screen.left;
      final minY = screen.top;
      final maxX = screen.right - rect.width;
      final maxY = screen.bottom - rect.height;

      final clampedX = rect.left.clamp(minX, maxX);
      final clampedY = rect.top.clamp(minY, maxY);

      final movedX = (clampedX - rect.left).abs();
      final movedY = (clampedY - rect.top).abs();
      if (movedX > _edgeSnapThreshold || movedY > _edgeSnapThreshold) {
        await windowManager.setPosition(Offset(clampedX, clampedY));
      }
    } finally {
      _isClamping = false;
    }
  }

  Future<void> _prepareWindow() async {
    _clickThrough = _overlayController.clickThrough.value;
    LogService.info(
      '[NoteWindow:${widget.noteId}] _prepareWindow. clickThrough=$_clickThrough',
    );

    await windowManager.setSkipTaskbar(true);
    await windowManager.setAsFrameless();
    await windowManager.setBackgroundColor(Colors.transparent);
    await windowManager.setHasShadow(false);
    await windowManager.setIgnoreMouseEvents(_clickThrough);

    final note = await _readNoteOnce();
    if (note != null && note.x != null && note.y != null) {
      await windowManager.setPosition(Offset(note.x!, note.y!));
    }
    await windowManager.setSize(_estimateWindowSize(note?.text ?? ''));
    _scheduleEdgeAlignmentUpdate();
    await _clampToScreenIfNeeded();

    // Attempt to show without activating initially
    await WindowZOrderService.showNoActivate();

    // Schedule enforcement
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _applyMouseModeAndZOrder('post-frame');
    });
    Future.delayed(const Duration(milliseconds: 250), () {
      _applyMouseModeAndZOrder('delayed-init');
    });
  }

  Future<Note?> _readNoteOnce() async {
    await _notesService.loadNotes();
    return _notesService.notes.cast<Note?>().firstWhere(
      (n) => n?.id == widget.noteId,
      orElse: () => null,
    );
  }

  void _handleRefresh() {
    LogService.info('[NoteWindow:${widget.noteId}] _handleRefresh');
    _loadNote();
  }

  void _handleClose() async {
    LogService.info('[NoteWindow:${widget.noteId}] _handleClose');
    await windowManager.close();
  }

  void _handleClickThroughChanged() {
    final newVal = _overlayController.clickThrough.value;
    LogService.info(
      '[NoteWindow:${widget.noteId}] ClickThrough changed: $_clickThrough -> $newVal',
    );
    setState(() {
      _clickThrough = newVal;
    });
    _applyMouseModeAndZOrder('click-through-changed');
  }

  Future<void> _loadNote() async {
    await _notesService.loadNotes();
    final note = _notesService.notes.cast<Note?>().firstWhere(
      (n) => n?.id == widget.noteId,
      orElse: () => null,
    );

    if (!mounted) return;

    if (note == null || !note.isPinned || note.isArchived || note.isDeleted) {
      LogService.info(
        '[NoteWindow:${widget.noteId}] Note unavailable or unpinned, closing.',
      );
      await windowManager.close();
      return;
    }

    setState(() {
      _note = note;
    });

    if (!_isEditing) {
      await windowManager.setSize(_estimateWindowSize(note.text));
      _scheduleEdgeAlignmentUpdate();
      await _clampToScreenIfNeeded();
    }
    await _applyMouseModeAndZOrder('load-note');
  }

  Future<void> _applyMouseModeAndZOrder(String reason) async {
    // Only log if not too frequent
    LogService.info(
      '[NoteWindow:${widget.noteId}] _applyMouseModeAndZOrder. Reason: $reason, clickThrough=$_clickThrough',
    );

    await windowManager.setIgnoreMouseEvents(_clickThrough);

    final note = _note;
    if (note == null) return;

    final interactive = !_clickThrough;
    final shouldBeTop = interactive || note.isAlwaysOnTop;
    final hwnd = await windowManager.getId();

    LogService.info(
      '[NoteWindow:${widget.noteId}] Z-Order check: interactive=$interactive, alwaysOnTop=${note.isAlwaysOnTop} => shouldBeTop=$shouldBeTop',
    );

    if (shouldBeTop) {
      WorkerWService.detachFromWorkerW(hwnd);
      await WindowZOrderService.setAlwaysOnTopNoActivate(true);
      LogService.info('[NoteWindow:${widget.noteId}] Set AlwaysOnTop(TRUE)');
    } else {
      await WindowZOrderService.setAlwaysOnTopNoActivate(false);
      final ok = WorkerWService.attachToWorkerW(hwnd);
      LogService.info(
        '[NoteWindow:${widget.noteId}] AttachWorkerW result: $ok',
      );

      if (!ok) {
        WorkerWService.detachFromWorkerW(hwnd);
        await WindowZOrderService.setAlwaysOnTopNoActivate(false);
        LogService.info(
          '[NoteWindow:${widget.noteId}] Attach failed, fallback to Normal/Bottom',
        );
      }
    }

    if (_isEditing) {
      await windowManager.show();
    } else {
      await WindowZOrderService.showNoActivate();
    }
  }

  Size _estimateWindowSize(String text) {
    final painter = TextPainter(
      text: TextSpan(text: text, style: NoteCardStyle.textStyle(false)),
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: _cardWidth - _cardPadding.horizontal);
    final height = (32 + painter.height + 24).clamp(_cardMinHeight, 10000.0);
    return Size(_cardWidth, height);
  }

  @override
  void onWindowMove() {
    _scheduleEdgeAlignmentUpdate();
    if (_clickThrough) return;
    _schedulePersistPosition();
  }

  @override
  void onWindowMoved() {
    _scheduleEdgeAlignmentUpdate();
    _scheduleClampToScreen();
    if (_clickThrough) return;
    _schedulePersistPosition();
  }

  void _scheduleClampToScreen() {
    _clampDebounce?.cancel();
    _clampDebounce = Timer(const Duration(milliseconds: 120), () async {
      if (!mounted) return;
      await _clampToScreenIfNeeded();
    });
  }

  void _schedulePersistPosition() {
    _moveDebounce?.cancel();
    _moveDebounce = Timer(const Duration(milliseconds: 250), () async {
      final pos = await windowManager.getPosition();
      final last = _lastSavedPos;
      if (last != null && (last - pos).distance < 0.5) return;
      _lastSavedPos = pos;

      await _notesService.updateNotePosition(
        widget.noteId,
        x: pos.dx,
        y: pos.dy,
      );
      WindowMessageService.instance.sendToPanels('refresh_notes');
    });
  }

  @override
  Widget build(BuildContext context) {
    _updateDevicePixelRatio(context);
    final note = _note;
    if (note == null) {
      return const Scaffold(
        backgroundColor: Colors.transparent,
        body: SizedBox.shrink(),
      );
    }

    return KeyboardListener(
      autofocus: true,
      focusNode: FocusNode(),
      onKeyEvent: (event) async {
        if (event is KeyDownEvent &&
            event.logicalKey == LogicalKeyboardKey.escape) {
          if (_isEditing) {
            setState(() {
              _isEditing = false;
            });
          } else {
            _overlayController.setClickThrough(true);
          }
        }
      },
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Align(
          alignment: _contentAlignment,
          child: HoverStateBuilder(
            enabled: !_clickThrough,
            builder: (context, hovering) {
              return Stack(
                children: [
                  StickyNoteCard(
                    note: note,
                    isEditing: _isEditing,
                    textController: _textController,
                    onDragUpdate: (_) {
                      if (!_clickThrough && !_isEditing) {
                        windowManager.startDragging();
                      }
                    },
                    onDragEnd: () {},
                    onDelete: () async {
                      await _notesService.deleteNote(note.id);
                      await WindowMessageService.instance.sendToPrimaryPanel(
                        'refresh_notes',
                      );
                      await windowManager.close();
                    },
                    onDoneToggle: () async {
                      await _notesService.toggleDone(note.id);
                      _ipcController.requestRefresh(_ipcScope);
                      WindowMessageService.instance.sendToPrimaryPanel(
                        'refresh_notes',
                      );
                    },
                    onUnpin: () async {
                      await _notesService.togglePin(note.id);
                      await WindowMessageService.instance.sendToPrimaryPanel(
                        'refresh_notes',
                      );
                      await windowManager.close();
                    },
                    onToggleZOrder: () async {
                      await _notesService.toggleZOrder(note.id);
                      _ipcController.requestRefresh(_ipcScope);
                      WindowMessageService.instance.sendToPrimaryPanel(
                        'refresh_notes',
                      );
                    },
                    onEdit: () async {
                      if (_clickThrough) {
                        _overlayController.setClickThrough(false);
                      }
                      await windowManager.focus();
                      setState(() {
                        _isEditing = true;
                        _textController.text = note.text;
                      });
                    },
                    onSave: () async {
                      final newText = _textController.text.trim();
                      if (newText.isNotEmpty) {
                        await _notesService.updateNote(
                          note.copyWith(text: newText),
                        );
                        if (mounted) {
                          await windowManager.setSize(
                            _estimateWindowSize(newText),
                          );
                          _scheduleEdgeAlignmentUpdate();
                          await _clampToScreenIfNeeded();
                        }
                        _ipcController.requestRefresh(_ipcScope);
                        WindowMessageService.instance.sendToPrimaryPanel(
                          'refresh_notes',
                        );
                      }
                      if (mounted) {
                        setState(() {
                          _isEditing = false;
                        });
                      }
                    },
                    onCancel: () {
                      setState(() {
                        _isEditing = false;
                      });
                    },
                    strings: widget.strings,
                    actionsVisible: hovering,
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
