import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:window_manager/window_manager.dart';

import '../../models/note_model.dart';
import '../../controllers/locale_controller.dart';
import '../../l10n/strings.dart';
import '../../services/notes_service.dart';
import '../../services/overlay_process_manager.dart';
import '../../services/panel_preferences.dart';
import '../../utils/note_search.dart';
import 'edit_note_dialog.dart';
import 'panel_header.dart';
import 'panel_notes_list.dart';

enum NoteViewMode { active, archived }

class PanelPage extends StatefulWidget {
  const PanelPage({
    super.key,
    required this.localeController,
    required this.strings,
  });

  final LocaleController localeController;
  final Strings strings;

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
  final OverlayProcessManager _overlayManager = OverlayProcessManager.instance;

  List<Note> _notes = [];
  final Map<String, NoteSearchIndex> _searchIndex = {};
  String _searchQuery = '';

  bool _hideAfterSave = true;
  bool _windowPinned = false;
  NoteViewMode _viewMode = NoteViewMode.active;
  NoteSortMode _sortMode = NoteSortMode.custom;

  @override
  void initState() {
    super.initState();
    windowManager.addListener(this);
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
    await _notesService.loadNotes(sortMode: _sortMode);
    if (!mounted) return;
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
    final sort = await PanelPreferences.getSortMode();
    if (!mounted) return;
    setState(() {
      _hideAfterSave = hide;
      _windowPinned = pinned;
      _viewMode = mode;
      _sortMode = sort;
    });
    await _loadNotes();
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
    await _notesService.addNote(text, isPinned: pin, sortMode: _sortMode);
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
    await _loadNotes();
  }

  Future<void> _setSortMode(NoteSortMode mode) async {
    setState(() => _sortMode = mode);
    await PanelPreferences.setSortMode(mode);
    await _loadNotes();
  }

  Future<void> _togglePin(Note note) async {
    await _notesService.togglePin(note.id, sortMode: _sortMode);
    await _loadNotes();
  }

  Future<void> _toggleDone(Note note) async {
    await _notesService.toggleDone(note.id, sortMode: _sortMode);
    await _loadNotes();
  }

  Future<void> _toggleArchive(Note note) async {
    await _notesService.toggleArchive(note.id, sortMode: _sortMode);
    await _loadNotes();
  }

  Future<void> _delete(Note note) async {
    await _notesService.deleteNote(note.id);
    await _loadNotes();
  }

  Future<void> _edit(Note note) async {
    final newText = await showEditNoteDialog(
      context,
      title: widget.strings.edit,
      initialText: note.text,
      strings: widget.strings,
    );
    if (!mounted) return;
    if (newText == null || newText.isEmpty) return;
    await _notesService.updateNote(
      note.copyWith(text: newText),
      sortMode: _sortMode,
    );
    await _loadNotes();
  }

  Future<void> _onReorder(int oldIndex, int newIndex) async {
    if (_sortMode != NoteSortMode.custom) return;

    final visible = _visibleNotes;
    if (newIndex > oldIndex) {
      newIndex -= 1;
    }
    final item = visible.removeAt(oldIndex);
    visible.insert(newIndex, item);

    await _notesService.reorderNotes(
      visible,
      isArchivedView: _viewMode == NoteViewMode.archived,
    );
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
                strings: widget.strings,
                newNoteController: _newNoteController,
                searchController: _searchController,
                focusNode: _focusNode,
                hideAfterSave: _hideAfterSave,
                onHideAfterSaveChanged: _setHideAfterSave,
                viewMode: _viewMode,
                onViewModeChanged: _setViewMode,
                sortMode: _sortMode,
                onSortModeChanged: _setSortMode,
                windowPinned: _windowPinned,
                onToggleWindowPinned: _toggleWindowPinned,
                onHideWindow: () => windowManager.hide(),
                onToggleLanguage: () async {
                  final next = widget.localeController.current == AppLocale.en
                      ? AppLocale.zh
                      : AppLocale.en;
                  await widget.localeController.setLocale(next);
                },
                onSave: () => _saveNote(pin: false),
                onOpenOverlay: () {
                  _openOverlay();
                },
              ),
              PanelNotesList(
                notes: _visibleNotes,
                onEdit: _edit,
                onDelete: _delete,
                onTogglePin: _togglePin,
                onToggleDone: _toggleDone,
                onToggleArchive: _toggleArchive,
                onReorder: _onReorder,
                sortMode: _sortMode,
                strings: widget.strings,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openOverlay() async {
    if (_overlayManager.isRunning) {
      _overlayManager.closeAll();
      await _overlayManager.stopAll();
      return;
    }

    final ok = await _overlayManager.startAll(
      localeController: widget.localeController,
      embedWorkerW: true,
      initialClickThrough: false,
    );
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to start separate overlay processes.'),
        ),
      );
    }
  }
}
