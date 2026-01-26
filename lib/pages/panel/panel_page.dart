import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:window_manager/window_manager.dart';

import '../../models/note_model.dart';
import '../../pages/overlay/overlay_page.dart';
import '../../services/notes_service.dart';
import '../../services/panel_preferences.dart';
import '../../utils/note_search.dart';
import 'edit_note_dialog.dart';
import 'panel_header.dart';
import 'panel_notes_list.dart';

enum NoteViewMode { active, archived }

class PanelPage extends StatefulWidget {
  const PanelPage({super.key});

  @override
  State<PanelPage> createState() => _PanelPageState();
}

class _HideIntent extends Intent {
  const _HideIntent();
}

class _PinAndSaveIntent extends Intent {
  const _PinAndSaveIntent();
}

class _PanelPageState extends State<PanelPage> with WindowListener {
  final TextEditingController _newNoteController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  final NotesService _notesService = NotesService();

  List<Note> _notes = [];
  final Map<String, NoteSearchIndex> _searchIndex = {};
  String _searchQuery = '';

  bool _hideAfterSave = true;
  bool _windowPinned = false;
  NoteViewMode _viewMode = NoteViewMode.active;

  @override
  void initState() {
    super.initState();
    windowManager.addListener(this);
    _loadNotes();
    _loadPreferences();
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text;
      });
    });
  }

  @override
  void dispose() {
    windowManager.removeListener(this);
    _newNoteController.dispose();
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  void onWindowFocus() {
    _focusNode.requestFocus();
  }

  Future<void> _loadNotes() async {
    await _notesService.loadNotes();
    setState(() {
      _notes = _notesService.notes;
      _searchIndex
        ..clear()
        ..addEntries(
          _notes.map((n) => MapEntry(n.id, NoteSearchIndex.fromText(n.text))),
        );
    });
  }

  Future<void> _loadPreferences() async {
    final hide = await PanelPreferences.getHideAfterSave();
    final pinned = await PanelPreferences.getWindowPinned();
    final mode = await PanelPreferences.getViewMode();
    if (!mounted) return;
    setState(() {
      _hideAfterSave = hide;
      _windowPinned = pinned;
      _viewMode = mode;
    });
    await windowManager.setAlwaysOnTop(pinned);
  }

  List<Note> get _visibleNotes {
    final base = switch (_viewMode) {
      NoteViewMode.active => _notes.where((n) => !n.isArchived).toList(),
      NoteViewMode.archived => _notes.where((n) => n.isArchived).toList(),
    };

    if (_searchQuery.trim().isEmpty) return base;

    final scored = <(Note, int)>[];
    for (final note in base) {
      final index =
          _searchIndex[note.id] ?? NoteSearchIndex.fromText(note.text);
      final m = NoteSearchMatcher.match(_searchQuery, index);
      if (m.matched) scored.add((note, m.score));
    }

    scored.sort((a, b) {
      final scoreCompare = b.$2.compareTo(a.$2);
      if (scoreCompare != 0) return scoreCompare;
      if (a.$1.isPinned != b.$1.isPinned) {
        return a.$1.isPinned ? -1 : 1;
      }
      return b.$1.updatedAt.compareTo(a.$1.updatedAt);
    });

    return scored.map((e) => e.$1).toList();
  }

  Future<void> _saveNote({required bool pin}) async {
    final text = _newNoteController.text.trim();
    if (text.isEmpty) return;
    await _notesService.addNote(text, isPinned: pin);
    _newNoteController.clear();
    await _loadNotes();
    if (_hideAfterSave) {
      await windowManager.hide();
    }
  }

  Future<void> _toggleWindowPinned() async {
    final next = !_windowPinned;
    setState(() => _windowPinned = next);
    await windowManager.setAlwaysOnTop(next);
    await PanelPreferences.setWindowPinned(next);
  }

  Future<void> _setHideAfterSave(bool value) async {
    setState(() => _hideAfterSave = value);
    await PanelPreferences.setHideAfterSave(value);
  }

  Future<void> _setViewMode(NoteViewMode mode) async {
    setState(() => _viewMode = mode);
    await PanelPreferences.setViewMode(mode);
  }

  Future<void> _togglePin(Note note) async {
    await _notesService.togglePin(note.id);
    await _loadNotes();
  }

  Future<void> _toggleDone(Note note) async {
    await _notesService.toggleDone(note.id);
    await _loadNotes();
  }

  Future<void> _toggleArchive(Note note) async {
    await _notesService.toggleArchive(note.id);
    await _loadNotes();
  }

  Future<void> _delete(Note note) async {
    await _notesService.deleteNote(note.id);
    await _loadNotes();
  }

  Future<void> _edit(Note note) async {
    final newText = await showEditNoteDialog(
      context,
      title: 'Edit note',
      initialText: note.text,
    );
    if (!mounted) return;
    if (newText == null || newText.isEmpty) return;
    await _notesService.updateNote(note.copyWith(text: newText));
    await _loadNotes();
  }

  @override
  Widget build(BuildContext context) {
    return Shortcuts(
      shortcuts: {
        LogicalKeySet(LogicalKeyboardKey.escape): const _HideIntent(),
        LogicalKeySet(LogicalKeyboardKey.control, LogicalKeyboardKey.enter):
            const _PinAndSaveIntent(),
      },
      child: Actions(
        actions: {
          _HideIntent: CallbackAction<_HideIntent>(
            onInvoke: (_) async {
              _newNoteController.clear();
              await windowManager.hide();
              return null;
            },
          ),
          _PinAndSaveIntent: CallbackAction<_PinAndSaveIntent>(
            onInvoke: (_) async {
              await _saveNote(pin: true);
              return null;
            },
          ),
        },
        child: Scaffold(
          backgroundColor: Colors.white,
          body: Column(
            children: [
              PanelHeader(
                newNoteController: _newNoteController,
                searchController: _searchController,
                focusNode: _focusNode,
                hideAfterSave: _hideAfterSave,
                onHideAfterSaveChanged: _setHideAfterSave,
                viewMode: _viewMode,
                onViewModeChanged: _setViewMode,
                windowPinned: _windowPinned,
                onToggleWindowPinned: _toggleWindowPinned,
                onHideWindow: () => windowManager.hide(),
                onSave: () => _saveNote(pin: false),
                onSaveAndPin: () => _saveNote(pin: true),
                onOpenOverlay: () =>
                    Navigator.of(context).pushNamed(OverlayPage.routeName),
              ),
              PanelNotesList(
                notes: _visibleNotes,
                onEdit: _edit,
                onDelete: _delete,
                onTogglePin: _togglePin,
                onToggleDone: _toggleDone,
                onToggleArchive: _toggleArchive,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
