import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:window_manager/window_manager.dart';

import '../../models/note_model.dart';
import '../../controllers/ipc_controller.dart';
import '../../controllers/ipc_scope.dart';
import '../../controllers/locale_controller.dart';
import '../../controllers/overlay_controller.dart';
import '../../l10n/strings.dart';
import '../../services/notes_service.dart';
import '../../services/sticky_note_window_manager.dart';
import '../../services/panel_preferences.dart';
import '../../services/tray_menu_guard.dart';
import '../../utils/note_search.dart';
import '../../widgets/glass_container.dart';
import 'edit_note_dialog.dart';
import 'panel_header.dart';
import 'panel_notes_list.dart';

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
  final StickyNoteWindowManager _overlayManager =
      StickyNoteWindowManager.instance;
  Timer? _zOrderTimer;

  List<Note> _notes = [];
  final Map<String, NoteSearchIndex> _searchIndex = {};
  String _searchQuery = '';

  bool _hideAfterSave = true;
  bool _windowPinned = false;
  double _glassOpacity = 0.18;
  NoteViewMode _viewMode = NoteViewMode.active;
  NoteSortMode _sortMode = NoteSortMode.custom;
  bool _overlayClickThrough = true;

  @override
  void initState() {
    super.initState();
    windowManager.addListener(this);
    _overlayManager.isRunningNotifier.addListener(_updateAlwaysOnTop);
    OverlayController.instance.clickThrough.addListener(_updateAlwaysOnTop);
    TrayMenuGuard.instance.isMenuOpen.addListener(_updateAlwaysOnTop);
    // Click-through is transient; do not persist across app launches.
    IpcController.instance.refreshTick(IpcScope.panel).addListener(
      _handleIpcRefresh,
    );
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
    _overlayManager.isRunningNotifier.removeListener(_updateAlwaysOnTop);
    OverlayController.instance.clickThrough.removeListener(_updateAlwaysOnTop);
    TrayMenuGuard.instance.isMenuOpen.removeListener(_updateAlwaysOnTop);
    IpcController.instance.refreshTick(IpcScope.panel).removeListener(
      _handleIpcRefresh,
    );
    _zOrderTimer?.cancel();
    super.dispose();
  }

  Future<void> _updateAlwaysOnTop() async {
    if (TrayMenuGuard.instance.isMenuOpen.value) {
      await windowManager.setAlwaysOnTop(false);
      return;
    }
    // If overlay is running, force Always On Top to ensure panel is clickable
    // above the overlay window. Otherwise, respect user preference.
    final overlayActive = _overlayManager.isRunning;
    final shouldBeTop = _windowPinned || overlayActive;

    await windowManager.setAlwaysOnTop(shouldBeTop);

    // Race condition fix & Interaction Toggle fix:
    // If Overlay is running, we need to assert Top AFTER Overlay changes its state.
    if (overlayActive) {
      // Manage Heartbeat Timer
      // We only need a heartbeat if the Overlay is Interactive (competing for top-most)
      // Manage Heartbeat Timer
      // REMOVED: Periodic heartbeat was causing System Tray menu to close immediately
      // because setAlwaysOnTop(true) steals focus/interrupts system popups.
      // We will rely on onWindowBlur to re-assert Z-order if we lose it.
      _zOrderTimer?.cancel();
      _zOrderTimer = null;

      // Initial staged re-assertion (Race condition fix)
      await Future.delayed(const Duration(milliseconds: 300));
      if (!mounted) return;
      await windowManager.setAlwaysOnTop(true);

      await Future.delayed(const Duration(milliseconds: 700));
      if (!mounted) return;
      await windowManager.setAlwaysOnTop(true);

      await Future.delayed(const Duration(milliseconds: 1500));
      if (!mounted) return;
      await windowManager.setAlwaysOnTop(true);
    } else {
      _zOrderTimer?.cancel();
      _zOrderTimer = null;
    }
  }

  void _handleIpcRefresh() {
    _loadNotes();
  }

  @override
  void onWindowFocus() {
    _focusNode.requestFocus();
  }

  @override
  void onWindowBlur() {
    // When focus is lost (e.g., clicked desktop), the Overlay might try to win Z-order.
    // We re-assert our status after a short delay to ensure we stay on top.
    if (_overlayManager.isRunning &&
        !TrayMenuGuard.instance.isMenuOpen.value) {
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) {
          windowManager.setAlwaysOnTop(true);
        }
      });
    }
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
    if (_overlayManager.isRunning) {
      await _overlayManager.sync(
        localeController: widget.localeController,
        embedWorkerW: true,
      );
    }
  }

  Future<void> _loadPreferences() async {
    final hide = await PanelPreferences.getHideAfterSave();
    final pinned = await PanelPreferences.getWindowPinned();
    final mode = await PanelPreferences.getViewMode();
    final sort = await PanelPreferences.getSortMode();
    final glass = await PanelPreferences.getGlassOpacity();
    final overlayEnabled = await PanelPreferences.getOverlayEnabled();
    if (!mounted) return;
    setState(() {
      _hideAfterSave = hide;
      _windowPinned = pinned;
      _viewMode = mode;
      _sortMode = sort;
      _glassOpacity = glass;
    });
    _overlayClickThrough = true;
    OverlayController.instance.setClickThrough(true);
    await _loadNotes();
    await windowManager.setAlwaysOnTop(pinned);
    if (overlayEnabled) {
      await _overlayManager.start(
        localeController: widget.localeController,
        embedWorkerW: true,
        initialClickThrough: _overlayClickThrough,
      );
    }
  }

  List<Note> get _visibleNotes {
    final base = switch (_viewMode) {
      NoteViewMode.active =>
        _notes.where((n) => !n.isArchived && !n.isDeleted).toList(),
      NoteViewMode.archived =>
        _notes.where((n) => n.isArchived && !n.isDeleted).toList(),
      NoteViewMode.trash => _notes.where((n) => n.isDeleted).toList(),
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
    // _loadNotes() will sync pinned note windows; avoid refreshing all windows
    // to prevent unrelated sticky notes from flashing.
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

  Future<void> _adjustGlass(double delta) async {
    final next = (_glassOpacity + delta).clamp(0.05, 1.0);
    setState(() => _glassOpacity = next);
    await PanelPreferences.setGlassOpacity(next);
  }

  Future<void> _togglePin(Note note) async {
    await _notesService.togglePin(note.id, sortMode: _sortMode);
    await _loadNotes();
    // _loadNotes() will sync windows (create/close) as needed.
  }

  Future<void> _toggleZOrder(Note note) async {
    await _notesService.toggleZOrder(note.id, sortMode: _sortMode);
    await _loadNotes();
    if (_overlayManager.isRunning) {
      await _overlayManager.refreshNote(note.id);
    }
  }

  Future<void> _toggleDone(Note note) async {
    await _notesService.toggleDone(note.id, sortMode: _sortMode);
    await _loadNotes();
    if (_overlayManager.isRunning) {
      await _overlayManager.refreshNote(note.id);
    }
  }

  Future<void> _toggleArchive(Note note) async {
    await _notesService.toggleArchive(note.id, sortMode: _sortMode);
    await _loadNotes();
    // Archiving will unpin and sync will close any related sticky window.
  }

  Future<void> _delete(Note note) async {
    if (_viewMode == NoteViewMode.trash) {
      await _notesService.permanentlyDeleteNote(note.id);
    } else {
      await _notesService.deleteNote(note.id);
    }
    await _loadNotes();
    // If the note was pinned, sync will close the sticky window.
  }

  Future<void> _restore(Note note) async {
    await _notesService.restoreNote(note.id, sortMode: _sortMode);
    await _loadNotes();
    // Restore does not imply pinning; no sticky refresh needed.
  }

  Future<void> _emptyTrash() async {
    await _notesService.emptyTrash();
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
    if (_overlayManager.isRunning) {
      await _overlayManager.refreshNote(note.id);
    }
  }

  void _onReorder(int oldIndex, int newIndex) {
    // Important: ReorderableListView expects the data list to be updated
    // synchronously inside this callback. If we wait for IO + reload, the drop
    // animation will look like a "flash/re-render".
    if (_sortMode != NoteSortMode.custom) return;
    if (_searchQuery.trim().isNotEmpty) return;

    final reorderedVisible = _visibleNotes;
    if (newIndex > oldIndex) {
      newIndex -= 1;
    }
    final item = reorderedVisible.removeAt(oldIndex);
    reorderedVisible.insert(newIndex, item);

    // Update customOrder in memory to keep the next reload stable.
    for (var i = 0; i < reorderedVisible.length; i++) {
      reorderedVisible[i].customOrder = i;
    }

    bool inCurrentView(Note n) => switch (_viewMode) {
      NoteViewMode.active => !n.isArchived && !n.isDeleted,
      NoteViewMode.archived => n.isArchived && !n.isDeleted,
      NoteViewMode.trash => n.isDeleted,
    };

    setState(() {
      // Rebuild the full list by replacing the visible subset with the new
      // order, while preserving all other notes' relative positions.
      final iter = reorderedVisible.iterator;
      _notes = _notes.map((n) {
        if (!inCurrentView(n)) return n;
        if (!iter.moveNext()) return n;
        return iter.current;
      }).toList(growable: false);
    });

    // Persist without forcing a reload (prevents visual flicker).
    unawaited(
      _notesService.reorderNotes(
        reorderedVisible,
        isArchivedView: _viewMode == NoteViewMode.archived,
      ),
    );
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
          backgroundColor: Colors.transparent,
          body: GlassContainer(
            borderRadius: BorderRadius.zero,
            opacity: _glassOpacity,
            blurSigma: 8 + _glassOpacity * 30,
            color: Colors.white,
            child: Column(
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
                  onEmptyTrash: _emptyTrash,
                  glassOpacity: _glassOpacity,
                  onAdjustGlass: _adjustGlass,
                ),
                PanelNotesList(
                  notes: _visibleNotes,
                  onEdit: _edit,
                  onDelete: _delete,
                  onRestore: _restore,
                  onTogglePin: _togglePin,
                  onToggleZOrder: _toggleZOrder,
                  onToggleDone: _toggleDone,
                  onToggleArchive: _toggleArchive,
                  onReorder: _onReorder,
                  viewMode: _viewMode,
                  canReorder:
                      _sortMode == NoteSortMode.custom &&
                      _viewMode != NoteViewMode.trash &&
                      _searchQuery.trim().isEmpty,
                  strings: widget.strings,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _openOverlay() async {
    if (_overlayManager.isRunning) {
      await _overlayManager.stop();
      await PanelPreferences.setOverlayEnabled(false);
      return;
    }

    _overlayClickThrough = true;
    OverlayController.instance.setClickThrough(true);
    final ok = await _overlayManager.start(
      localeController: widget.localeController,
      embedWorkerW: true,
      initialClickThrough: _overlayClickThrough,
    );
    if (ok) {
      await PanelPreferences.setOverlayEnabled(true);
    }
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to start separate overlay processes.'),
        ),
      );
    }
  }
}
