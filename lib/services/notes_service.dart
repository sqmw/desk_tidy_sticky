import 'dart:convert';
import 'dart:developer' as dev;
import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import '../models/note_model.dart';

enum NoteSortMode { custom, newest, oldest }

class NotesService {
  static final NotesService _instance = NotesService._internal();
  factory NotesService() => _instance;
  NotesService._internal();

  List<Note> _notes = [];
  List<Note> get notes => List.unmodifiable(_notes);
  List<Note> get pinnedNotes =>
      _notes.where((n) => n.isPinned && !n.isArchived).toList();

  // Directory for storing data
  Future<Directory> get _storageDirectory async {
    final appDocDir = await getApplicationSupportDirectory();
    final stickyDir = Directory(
      p.join(appDocDir.parent.path, 'desk_tidy_sticky'),
    );
    if (!await stickyDir.exists()) {
      await stickyDir.create(recursive: true);
    }
    return stickyDir;
  }

  Future<File> get _notesFile async {
    final dir = await _storageDirectory;
    return File(p.join(dir.path, 'notes.json'));
  }

  Future<void> loadNotes({NoteSortMode sortMode = NoteSortMode.custom}) async {
    try {
      final file = await _notesFile;
      if (await file.exists()) {
        final content = await file.readAsString();
        final List<dynamic> jsonList = jsonDecode(content);
        _notes = jsonList.map((e) => Note.fromJson(e)).toList();
        _sort(sortMode);
      }
    } catch (e) {
      dev.log('Error loading notes: $e', name: 'NotesService');
      _notes = [];
    }
  }

  Future<void> saveNotes() async {
    try {
      final file = await _notesFile;
      final jsonList = _notes.map((e) => e.toJson()).toList();
      final content = jsonEncode(jsonList);

      // Atomic write: write to temp then rename
      final tempFile = File('${file.path}.tmp');
      await tempFile.writeAsString(content);
      if (await file.exists()) {
        await file.delete();
      }
      await tempFile.rename(file.path);
    } catch (e) {
      dev.log('Error saving notes: $e', name: 'NotesService');
    }
  }

  Future<void> addNote(
    String text, {
    bool isPinned = false,
    NoteSortMode sortMode = NoteSortMode.custom,
  }) async {
    final note = Note(text: text, isPinned: isPinned);
    // For custom order, new note comes first
    if (sortMode == NoteSortMode.custom) {
      _notes.forEach((n) => n.customOrder = (n.customOrder ?? 0) + 1);
      note.customOrder = 0;
    }
    _notes.insert(0, note);
    _sort(sortMode);
    await saveNotes();
  }

  Future<void> updateNote(
    Note updatedNote, {
    NoteSortMode sortMode = NoteSortMode.custom,
  }) async {
    final index = _notes.indexWhere((n) => n.id == updatedNote.id);
    if (index != -1) {
      _notes[index] = updatedNote;
      _sort(sortMode);
      await saveNotes();
    }
  }

  Future<void> reorderNotes(
    List<Note> reorderedVisibleNotes, {
    required bool isArchivedView,
  }) async {
    // 1. Update customOrder based on the new order in the visible list.
    // We only update the customOrder for notes in the current view.
    for (int i = 0; i < reorderedVisibleNotes.length; i++) {
      final note = reorderedVisibleNotes[i];
      final originalIndex = _notes.indexWhere((n) => n.id == note.id);
      if (originalIndex != -1) {
        _notes[originalIndex].customOrder = i;
      }
    }
    // Note: We don't call _sort here because the list is already in order.
    // But we need to save.
    await saveNotes();
  }

  Future<void> deleteNote(String id) async {
    _notes.removeWhere((n) => n.id == id);
    await saveNotes();
  }

  Future<void> togglePin(
    String id, {
    NoteSortMode sortMode = NoteSortMode.custom,
  }) async {
    final index = _notes.indexWhere((n) => n.id == id);
    if (index != -1) {
      _notes[index] = _notes[index].copyWith(isPinned: !_notes[index].isPinned);
      _sort(sortMode);
      await saveNotes();
    }
  }

  Future<void> toggleDone(
    String id, {
    NoteSortMode sortMode = NoteSortMode.custom,
  }) async {
    final index = _notes.indexWhere((n) => n.id == id);
    if (index != -1) {
      _notes[index] = _notes[index].copyWith(isDone: !_notes[index].isDone);
      _sort(sortMode);
      await saveNotes();
    }
  }

  Future<void> toggleArchive(
    String id, {
    NoteSortMode sortMode = NoteSortMode.custom,
  }) async {
    final index = _notes.indexWhere((n) => n.id == id);
    if (index != -1) {
      _notes[index] = _notes[index].copyWith(
        isArchived: !_notes[index].isArchived,
      );
      _sort(sortMode);
      await saveNotes();
    }
  }

  void _sort(NoteSortMode mode) {
    _notes.sort((a, b) {
      // Primary: Archived vs Active (Archived always at bottom if mixed, though views are usually separate)
      if (a.isArchived != b.isArchived) {
        return a.isArchived ? 1 : -1;
      }

      // Secondary: Pinned vs Unpinned (Pinned always at top)
      if (a.isPinned != b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      // Tertiary: Selected Sort Mode
      switch (mode) {
        case NoteSortMode.custom:
          final orderA = a.customOrder ?? 0;
          final orderB = b.customOrder ?? 0;
          return orderA.compareTo(orderB);
        case NoteSortMode.newest:
          return b.createdAt.compareTo(a.createdAt);
        case NoteSortMode.oldest:
          return a.createdAt.compareTo(b.createdAt);
      }
    });
  }
}
