import 'dart:convert';
import 'dart:developer' as dev;
import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import '../models/note_model.dart';

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

  Future<void> loadNotes() async {
    try {
      final file = await _notesFile;
      if (await file.exists()) {
        final content = await file.readAsString();
        final List<dynamic> jsonList = jsonDecode(content);
        _notes = jsonList.map((e) => Note.fromJson(e)).toList();
        _sort();
      }
    } catch (e) {
      dev.log('Error loading notes: $e', name: 'NotesService');
      // If error, start empty or backup? For now empty.
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

  Future<void> addNote(String text, {bool isPinned = false}) async {
    final note = Note(text: text, isPinned: isPinned);
    _notes.insert(0, note);
    _sort();
    await saveNotes();
  }

  Future<void> updateNote(Note updatedNote) async {
    final index = _notes.indexWhere((n) => n.id == updatedNote.id);
    if (index != -1) {
      _notes[index] = updatedNote;
      _sort();
      await saveNotes();
    }
  }

  Future<void> deleteNote(String id) async {
    _notes.removeWhere((n) => n.id == id);
    await saveNotes();
  }

  Future<void> togglePin(String id) async {
    final index = _notes.indexWhere((n) => n.id == id);
    if (index != -1) {
      _notes[index] = _notes[index].copyWith(isPinned: !_notes[index].isPinned);
      _sort();
      await saveNotes();
    }
  }

  Future<void> toggleDone(String id) async {
    final index = _notes.indexWhere((n) => n.id == id);
    if (index != -1) {
      _notes[index] = _notes[index].copyWith(isDone: !_notes[index].isDone);
      _sort();
      await saveNotes();
    }
  }

  Future<void> toggleArchive(String id) async {
    final index = _notes.indexWhere((n) => n.id == id);
    if (index != -1) {
      _notes[index] = _notes[index].copyWith(
        isArchived: !_notes[index].isArchived,
      );
      _sort();
      await saveNotes();
    }
  }

  void _sort() {
    _notes.sort((a, b) {
      if (a.isArchived != b.isArchived) {
        return a.isArchived ? 1 : -1;
      }
      if (a.isPinned != b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return b.updatedAt.compareTo(a.updatedAt);
    });
  }
}
