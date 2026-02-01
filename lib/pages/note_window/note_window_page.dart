// ignore_for_file: use_build_context_synchronously

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:window_manager/window_manager.dart';

import '../../controllers/ipc_controller.dart';
import '../../controllers/ipc_scope.dart';
import '../../controllers/overlay_controller.dart';
import '../../l10n/strings.dart';
import '../../models/note_model.dart';
import '../../services/notes_service.dart';
import '../../services/window_message_service.dart';
import '../../services/window_zorder_service.dart';
import '../../services/workerw_service.dart';
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

  Timer? _moveDebounce;
  Offset? _lastSavedPos;

  static const double _cardWidth = 260;
  static const double _cardMinHeight = 60;
  static const EdgeInsets _cardPadding = EdgeInsets.all(12);

  @override
  void initState() {
    super.initState();
    if (widget.noteId.trim().isEmpty) {
      // Defensive: should never happen unless args were malformed.
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
    windowManager.removeListener(this);
    _overlayController.clickThrough.removeListener(_handleClickThroughChanged);
    _ipcController.refreshTick(_ipcScope).removeListener(_handleRefresh);
    _ipcController.closeTick(_ipcScope).removeListener(_handleClose);
    _moveDebounce?.cancel();
    super.dispose();
  }

  Future<void> _prepareWindow() async {
    _clickThrough = _overlayController.clickThrough.value;

    await windowManager.setSkipTaskbar(true);
    await windowManager.setAsFrameless();
    await windowManager.setBackgroundColor(Colors.transparent);
    await windowManager.setHasShadow(false);
    await windowManager.setIgnoreMouseEvents(_clickThrough);

    // Initial bounds: use stored note position if present; otherwise keep default.
    final note = await _readNoteOnce();
    if (note != null && note.x != null && note.y != null) {
      await windowManager.setPosition(Offset(note.x!, note.y!));
    }
    await windowManager.setSize(_estimateWindowSize(note?.text ?? ''));

    await WindowZOrderService.showNoActivate();
    // One more enforcement after first frame to avoid "enabled but invisible"
    // when the window gets reparented to WorkerW too early.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _applyMouseModeAndZOrder();
    });
    Future.delayed(const Duration(milliseconds: 250), () {
      _applyMouseModeAndZOrder();
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
    _loadNote();
  }

  void _handleClose() async {
    await windowManager.close();
  }

  void _handleClickThroughChanged() {
    setState(() {
      _clickThrough = _overlayController.clickThrough.value;
    });
    _applyMouseModeAndZOrder();
  }

  Future<void> _loadNote() async {
    await _notesService.loadNotes();
    final note = _notesService.notes.cast<Note?>().firstWhere(
      (n) => n?.id == widget.noteId,
      orElse: () => null,
    );

    if (!mounted) return;

    // If note disappeared (unpinned/deleted/archived), close the window.
    if (note == null || !note.isPinned || note.isArchived || note.isDeleted) {
      await windowManager.close();
      return;
    }

    setState(() {
      _note = note;
    });

    await windowManager.setSize(_estimateWindowSize(note.text));
    await _applyMouseModeAndZOrder();
  }

  Future<void> _applyMouseModeAndZOrder() async {
    await windowManager.setIgnoreMouseEvents(_clickThrough);

    final note = _note;
    if (note == null) return;

    final interactive = !_clickThrough;
    final shouldBeTop = interactive || note.isAlwaysOnTop;
    final hwnd = await windowManager.getId();

    if (shouldBeTop) {
      // If this window was previously embedded under WorkerW (bottom mode),
      // it must be detached first, otherwise "always on top" has no effect.
      WorkerWService.detachFromWorkerW(hwnd);
      await WindowZOrderService.setAlwaysOnTopNoActivate(true);
    } else {
      await WindowZOrderService.setAlwaysOnTopNoActivate(false);
      // Use WorkerW embedding to make "bottom" visible on desktop (instead of
      // being pushed below desktop windows by HWND_BOTTOM).
      final ok = WorkerWService.attachToWorkerW(hwnd);
      if (!ok) {
        // Fallback: avoid forcing HWND_BOTTOM which can make the window
        // completely invisible on some setups.
        WorkerWService.detachFromWorkerW(hwnd);
        await WindowZOrderService.setAlwaysOnTopNoActivate(false);
      }
    }

    await WindowZOrderService.showNoActivate();
  }

  Size _estimateWindowSize(String text) {
    // plumbing. Windows can be resized again after a refresh.
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: NoteCardStyle.textStyle(false).copyWith(fontSize: 14),
      ),
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: _cardWidth - _cardPadding.horizontal);
    final height =
        (32 + painter.height + 24) // 32 header + 12 top + 12 bottom padding
            .clamp(_cardMinHeight, 10000.0);
    return Size(_cardWidth, height);
  }

  @override
  void onWindowMove() {
    if (_clickThrough) return;
    _schedulePersistPosition();
  }

  @override
  void onWindowMoved() {
    if (_clickThrough) return;
    _schedulePersistPosition();
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
          _overlayController.setClickThrough(true);
        }
      },
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Align(
          alignment: Alignment.bottomCenter,
          child: HoverStateBuilder(
            enabled: !_clickThrough,
            builder: (context, hovering) {
              return Stack(
                children: [
                  StickyNoteCard(
                    note: note,
                    onDragUpdate: (_) {
                      if (!_clickThrough) {
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
                      // Note window is the current engine; sendToAll won't reach us.
                      _ipcController.requestRefresh(_ipcScope);
                      WindowMessageService.instance.sendToPrimaryPanel(
                        'refresh_notes',
                      );
                    },
                    onUnpin: () async {
                      await _notesService.togglePin(note.id);
                      // Close after unpin, but still notify panels/other windows.
                      await WindowMessageService.instance.sendToPrimaryPanel(
                        'refresh_notes',
                      );
                      await windowManager.close();
                    },
                    onToggleZOrder: () async {
                      await _notesService.toggleZOrder(note.id);
                      // Apply new z-order/icon state immediately in this window.
                      _ipcController.requestRefresh(_ipcScope);
                      WindowMessageService.instance.sendToPrimaryPanel(
                        'refresh_notes',
                      );
                    },
                    onEdit: () async {
                      if (_clickThrough) {
                        _overlayController.setClickThrough(false);
                      }
                      final controller = TextEditingController(text: note.text);
                      final newText = await showDialog<String>(
                        context: context,
                        builder: (context) {
                          return AlertDialog(
                            title: Text(widget.strings.edit),
                            content: TextField(
                              controller: controller,
                              autofocus: true,
                              minLines: 1,
                              maxLines: 8,
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.of(context).pop(),
                                child: Text(widget.strings.cancel),
                              ),
                              FilledButton(
                                onPressed: () => Navigator.of(
                                  context,
                                ).pop(controller.text.trim()),
                                child: Text(widget.strings.saveNote),
                              ),
                            ],
                          );
                        },
                      );
                      if (!mounted) return;
                      if (newText == null || newText.isEmpty) return;
                      await _notesService.updateNote(
                        note.copyWith(text: newText),
                      );
                      // Update current note window immediately.
                      _ipcController.requestRefresh(_ipcScope);
                      WindowMessageService.instance.sendToPrimaryPanel(
                        'refresh_notes',
                      );
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
