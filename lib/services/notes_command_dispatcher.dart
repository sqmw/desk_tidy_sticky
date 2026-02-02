import '../models/notes_command.dart';
import 'notes_service.dart';
import 'window_message_service.dart';

/// Client-side helper used by non-panel windows.
///
/// Single-writer design: mutations should be sent to the primary panel process
/// via `notes_command`. If the panel is unavailable, we fall back to local write
/// (best-effort) to keep the app usable.
class NotesCommandDispatcher {
  NotesCommandDispatcher._();

  static final NotesCommandDispatcher instance = NotesCommandDispatcher._();

  Future<void> togglePin(String noteId) async {
    await _dispatchOrFallback(
      NotesCommand(type: NotesCommandType.togglePin, noteId: noteId),
      fallback: () => NotesService().togglePin(noteId),
    );
  }

  Future<void> toggleDone(String noteId) async {
    await _dispatchOrFallback(
      NotesCommand(type: NotesCommandType.toggleDone, noteId: noteId),
      fallback: () => NotesService().toggleDone(noteId),
    );
  }

  Future<void> toggleZOrder(String noteId) async {
    await _dispatchOrFallback(
      NotesCommand(type: NotesCommandType.toggleZOrder, noteId: noteId),
      fallback: () => NotesService().toggleZOrder(noteId),
    );
  }

  Future<void> deleteNote(String noteId) async {
    await _dispatchOrFallback(
      NotesCommand(type: NotesCommandType.deleteNote, noteId: noteId),
      fallback: () => NotesService().deleteNote(noteId),
    );
  }

  Future<void> updateText(String noteId, String text) async {
    await _dispatchOrFallback(
      NotesCommand(
        type: NotesCommandType.updateText,
        noteId: noteId,
        text: text,
      ),
      fallback: () async {
        final notes = NotesService();
        await notes.loadNotes();
        final note = notes.notes.where((n) => n.id == noteId).firstOrNull;
        if (note == null) return;
        await notes.updateNote(note.copyWith(text: text));
      },
    );
  }

  Future<void> updatePosition(String noteId, {required double x, required double y}) async {
    await _dispatchOrFallback(
      NotesCommand(
        type: NotesCommandType.updatePosition,
        noteId: noteId,
        x: x,
        y: y,
      ),
      fallback: () => NotesService().updateNotePosition(noteId, x: x, y: y),
    );
  }

  Future<void> _dispatchOrFallback(
    NotesCommand command, {
    required Future<void> Function() fallback,
  }) async {
    try {
      await WindowMessageService.instance.sendToPrimaryPanel(
        'notes_command',
        command.toArgs(),
      );
    } catch (_) {
      await fallback();
    }
  }
}

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull => isEmpty ? null : first;
}

