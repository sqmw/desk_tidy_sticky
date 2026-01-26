import 'dart:math';

import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';

import '../../models/note_model.dart';
import '../../services/notes_service.dart';
import 'overlay_toolbar.dart';
import 'sticky_note_card.dart';

class OverlayPage extends StatefulWidget {
  static const routeName = '/overlay';
  const OverlayPage({super.key});

  @override
  State<OverlayPage> createState() => _OverlayPageState();
}

class _OverlayPageState extends State<OverlayPage> with WindowListener {
  final NotesService _notesService = NotesService();

  bool _clickThrough = false;
  bool? _previousAlwaysOnTop;
  List<Note> _pinned = [];
  final Map<String, Offset> _positions = {};

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
    _previousAlwaysOnTop ??= await windowManager.isAlwaysOnTop();
    await windowManager.setAlwaysOnTop(true);
    await windowManager.setSkipTaskbar(true);
    await windowManager.setAsFrameless();
    await windowManager.setBackgroundColor(Colors.transparent);
    await windowManager.setHasShadow(false);
    await windowManager.setIgnoreMouseEvents(_clickThrough);
  }

  Future<void> _restoreWindow() async {
    await windowManager.setAlwaysOnTop(_previousAlwaysOnTop ?? false);
    await windowManager.setIgnoreMouseEvents(false);
    await windowManager.setHasShadow(true);
  }

  Offset _fallbackPosition(int index) {
    final dx = 24 + (index % 3) * 260;
    final dy = 72 + (index ~/ 3) * 180;
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
    final base = _positions[note.id] ?? const Offset(24, 72);
    _positions[note.id] = Offset(
      max(8, base.dx + delta.dx),
      max(8, base.dy + delta.dy),
    );
    setState(() {});
  }

  Future<void> _commitPosition(Note note) async {
    final pos = _positions[note.id];
    if (pos == null) return;
    await _notesService.updateNote(note.copyWith(x: pos.dx, y: pos.dy));
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
          title: const Text('Edit note'),
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
    if (newText == null) return;
    if (newText.isEmpty) return;
    await _notesService.updateNote(note.copyWith(text: newText));
    await _refreshPinned();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          Positioned(
            top: 12,
            right: 12,
            child: OverlayToolbar(
              clickThrough: _clickThrough,
              onClose: () => Navigator.of(context).maybePop(),
              onToggleClickThrough: (value) async {
                setState(() => _clickThrough = value);
                await windowManager.setIgnoreMouseEvents(value);
              },
              onRefresh: _refreshPinned,
            ),
          ),
          ..._pinned.map((note) {
            final pos = _positions[note.id] ?? const Offset(24, 72);
            return Positioned(
              left: pos.dx,
              top: pos.dy,
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
    );
  }
}
