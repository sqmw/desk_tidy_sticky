// ignore_for_file: use_build_context_synchronously

import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:window_manager/window_manager.dart';
import 'package:win32/win32.dart' as win32;

import '../../l10n/strings.dart';
import '../../models/note_model.dart';
import '../../services/notes_service.dart';
import 'overlay_toolbar.dart';
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

  bool _clickThrough = false;
  bool? _previousAlwaysOnTop;
  List<Note> _pinned = [];
  final Map<String, Offset> _positions = {};
  Rect _virtualRect = const Rect.fromLTWH(0, 0, 1920, 1080);

  @override
  void initState() {
    super.initState();
    windowManager.addListener(this);
    _prepareWindow();
    _refreshPinned();
  }

  @override
  void dispose() {
    windowManager.removeListener(this);
    _restoreWindow();
    super.dispose();
  }

  Future<void> _prepareWindow() async {
    _virtualRect = _getVirtualScreenRect();
    _previousAlwaysOnTop ??= await windowManager.isAlwaysOnTop();
    await windowManager.setAlwaysOnTop(true);
    await windowManager.setSkipTaskbar(true);
    await windowManager.setAsFrameless();
    await windowManager.setBackgroundColor(Colors.transparent);
    await windowManager.setHasShadow(false);
    await windowManager.setIgnoreMouseEvents(_clickThrough);
    await windowManager.setPosition(_virtualRect.topLeft);
    await windowManager.setSize(_virtualRect.size);
  }

  Future<void> _restoreWindow() async {
    await windowManager.setAlwaysOnTop(_previousAlwaysOnTop ?? false);
    await windowManager.setIgnoreMouseEvents(false);
    await windowManager.setHasShadow(true);
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
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () =>
                  Navigator.of(context).pop(controller.text.trim()),
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
    if (!mounted) return;
    if (newText == null || newText.isEmpty) return;
    await _notesService.updateNote(note.copyWith(text: newText));
    await _refreshPinned();
  }

  @override
  Widget build(BuildContext context) {
    return KeyboardListener(
      autofocus: true,
      focusNode: FocusNode(),
      onKeyEvent: (event) async {
        if (event is KeyDownEvent &&
            event.logicalKey == LogicalKeyboardKey.escape) {
          setState(() => _clickThrough = false);
          await windowManager.setIgnoreMouseEvents(false);
        }
      },
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Stack(
          children: [
            Positioned(
              top: 12,
              right: 12,
              child: OverlayToolbar(
                clickThrough: _clickThrough,
                onClose: () async {
                  await windowManager.setIgnoreMouseEvents(false);
                  if (mounted) Navigator.of(context).maybePop();
                },
                onToggleClickThrough: (value) async {
                  setState(() => _clickThrough = value);
                  await windowManager.setIgnoreMouseEvents(value);
                },
                onRefresh: _refreshPinned,
              ),
            ),
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
                  },
                  onDoneToggle: () async {
                    await _notesService.toggleDone(note.id);
                    await _refreshPinned();
                  },
                  onUnpin: () async {
                    await _notesService.togglePin(note.id);
                    await _refreshPinned();
                  },
                  onEdit: () => _editNote(note),
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
    // 留出任务栏余量 80px，避免遮挡托盘
    const taskbarMargin = 80.0;
    return Rect.fromLTWH(
      left.toDouble(),
      top.toDouble(),
      width.toDouble(),
      max(0, height.toDouble() - taskbarMargin),
    );
  }
}
