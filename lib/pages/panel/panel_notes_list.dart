import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../l10n/strings.dart';
import '../../models/note_model.dart';
import '../../services/notes_service.dart';

typedef NoteAction = Future<void> Function(Note note);
typedef ReorderCallback = Future<void> Function(int oldIndex, int newIndex);

class PanelNotesList extends StatelessWidget {
  final List<Note> notes;
  final NoteAction onEdit;
  final NoteAction onDelete;
  final NoteAction onTogglePin;
  final NoteAction onToggleDone;
  final NoteAction onToggleArchive;
  final ReorderCallback onReorder;
  final NoteSortMode sortMode;
  final Strings strings;

  const PanelNotesList({
    super.key,
    required this.notes,
    required this.onEdit,
    required this.onDelete,
    required this.onTogglePin,
    required this.onToggleDone,
    required this.onToggleArchive,
    required this.onReorder,
    required this.sortMode,
    required this.strings,
  });

  @override
  Widget build(BuildContext context) {
    final canReorder = sortMode == NoteSortMode.custom;

    return Expanded(
      child: ReorderableListView.builder(
        itemCount: notes.length,
        onReorder: onReorder,
        buildDefaultDragHandles: false, // Using custom drag handle
        itemBuilder: (context, index) {
          final note = notes[index];
          return Dismissible(
            key: Key(note.id),
            background: Container(
              color: Colors.red,
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.only(left: 20),
              child: const Icon(Icons.delete, color: Colors.white),
            ),
            secondaryBackground: Container(
              color: Colors.blueGrey,
              alignment: Alignment.centerRight,
              padding: const EdgeInsets.only(right: 20),
              child: Icon(
                note.isArchived ? Icons.unarchive : Icons.archive,
                color: Colors.white,
              ),
            ),
            onDismissed: (direction) async {
              if (direction == DismissDirection.startToEnd) {
                await onDelete(note);
              } else {
                await onToggleArchive(note);
              }
            },
            child: ListTile(
              dense: true,
              title: Text(
                note.text,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  decoration: note.isDone ? TextDecoration.lineThrough : null,
                  color: note.isArchived
                      ? Colors.grey
                      : (note.isDone ? Colors.grey : Colors.black87),
                  fontWeight: note.isPinned ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
              subtitle: Text(
                DateFormat('MM-dd HH:mm').format(note.updatedAt),
                style: const TextStyle(fontSize: 10),
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    tooltip: strings.edit,
                    icon: const Icon(Icons.edit, size: 16),
                    onPressed: () => onEdit(note),
                  ),
                  IconButton(
                    tooltip: note.isPinned
                        ? strings.unpinNote
                        : strings.pinNote,
                    icon: Icon(
                      note.isPinned ? Icons.push_pin : Icons.push_pin_outlined,
                      size: 16,
                      color: note.isPinned ? Colors.orange : Colors.grey,
                    ),
                    onPressed: () => onTogglePin(note),
                  ),
                  IconButton(
                    tooltip: note.isDone
                        ? strings.markUndone
                        : strings.markDone,
                    icon: Icon(
                      note.isDone
                          ? Icons.check_circle
                          : Icons.check_circle_outline,
                      size: 16,
                      color: note.isDone ? Colors.green : Colors.grey,
                    ),
                    onPressed: () => onToggleDone(note),
                  ),
                  IconButton(
                    tooltip: note.isArchived
                        ? strings.unarchive
                        : strings.archive,
                    icon: Icon(
                      note.isArchived ? Icons.unarchive : Icons.archive,
                      size: 16,
                    ),
                    onPressed: () => onToggleArchive(note),
                  ),
                  if (canReorder)
                    ReorderableDragStartListener(
                      index: index,
                      child: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Icon(
                          Icons.drag_handle,
                          size: 18,
                          color: Colors.grey,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
