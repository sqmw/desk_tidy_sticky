import '../models/notes_command.dart';
import 'notes_service.dart';

class NotesCommandResult {
  const NotesCommandResult({
    required this.noteId,
    required this.refreshPanel,
    required this.refreshOverlays,
    required this.refreshNoteWindow,
    required this.closeNoteWindow,
  });

  final String noteId;
  final bool refreshPanel;
  final bool refreshOverlays;
  final bool refreshNoteWindow;
  final bool closeNoteWindow;

  static NotesCommandResult refreshAll(String noteId) {
    return NotesCommandResult(
      noteId: noteId,
      refreshPanel: true,
      refreshOverlays: true,
      refreshNoteWindow: true,
      closeNoteWindow: false,
    );
  }
}

/// Panel-side handler. Only the primary panel process should execute mutations.
class NotesCommandHandler {
  NotesCommandHandler({NotesService? notesService})
    : _notesService = notesService ?? NotesService();

  final NotesService _notesService;

  Future<NotesCommandResult> handle(NotesCommand command) async {
    switch (command.type) {
      case NotesCommandType.togglePin:
        await _notesService.togglePin(command.noteId);
        return _closeIfUnpinned(command.noteId);
      case NotesCommandType.toggleDone:
        await _notesService.toggleDone(command.noteId);
        return NotesCommandResult.refreshAll(command.noteId);
      case NotesCommandType.toggleZOrder:
        await _notesService.toggleZOrder(command.noteId);
        return NotesCommandResult.refreshAll(command.noteId);
      case NotesCommandType.deleteNote:
        await _notesService.deleteNote(command.noteId);
        return NotesCommandResult(
          noteId: command.noteId,
          refreshPanel: true,
          refreshOverlays: true,
          refreshNoteWindow: false,
          closeNoteWindow: true,
        );
      case NotesCommandType.updateText:
        final text = command.text ?? '';
        await _updateText(command.noteId, text);
        return NotesCommandResult.refreshAll(command.noteId);
      case NotesCommandType.updatePosition:
        final x = command.x;
        final y = command.y;
        if (x != null && y != null) {
          await _notesService.updateNotePosition(command.noteId, x: x, y: y);
        }
        // Position updates are frequent; do not broadcast refresh to everyone.
        return NotesCommandResult(
          noteId: command.noteId,
          refreshPanel: false,
          refreshOverlays: false,
          refreshNoteWindow: false,
          closeNoteWindow: false,
        );
    }
  }

  Future<void> _updateText(String noteId, String text) async {
    await _notesService.loadNotes();
    final note = _notesService.notes.where((n) => n.id == noteId).firstOrNull;
    if (note == null) return;
    await _notesService.updateNote(note.copyWith(text: text));
  }

  Future<NotesCommandResult> _closeIfUnpinned(String noteId) async {
    await _notesService.loadNotes();
    final note = _notesService.notes.where((n) => n.id == noteId).firstOrNull;
    if (note == null) return NotesCommandResult.refreshAll(noteId);

    final shouldClose =
        !note.isPinned || note.isArchived || note.isDeleted;

    return NotesCommandResult(
      noteId: noteId,
      refreshPanel: true,
      refreshOverlays: true,
      refreshNoteWindow: !shouldClose,
      closeNoteWindow: shouldClose,
    );
  }
}

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull => isEmpty ? null : first;
}
