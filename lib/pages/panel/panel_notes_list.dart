import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../l10n/strings.dart';
import '../../models/note_model.dart';
import '../../theme/app_theme.dart';

typedef NoteAction = Future<void> Function(Note note);
typedef ReorderCallback = Future<void> Function(int oldIndex, int newIndex);

class PanelNotesList extends StatelessWidget {
  final List<Note> notes;
  final NoteAction onEdit;
  final NoteAction onDelete;
  final NoteAction onTogglePin;
  final NoteAction onToggleDone;
  final NoteAction onToggleArchive;
  final NoteAction? onRestore;
  final ReorderCallback onReorder;
  final NoteSortMode sortMode;
  final NoteViewMode viewMode;
  final Strings strings;

  const PanelNotesList({
    super.key,
    required this.notes,
    required this.onEdit,
    required this.onDelete,
    required this.onTogglePin,
    required this.onToggleDone,
    required this.onToggleArchive,
    this.onRestore,
    required this.onReorder,
    required this.sortMode,
    required this.viewMode,
    required this.strings,
  });

  @override
  Widget build(BuildContext context) {
    final canReorder =
        sortMode == NoteSortMode.custom && viewMode != NoteViewMode.trash;

    return Expanded(
      child: ReorderableListView.builder(
        itemCount: notes.length,
        onReorder: onReorder,
        buildDefaultDragHandles: false,
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
              color: viewMode == NoteViewMode.trash
                  ? Colors.green
                  : Colors.blueGrey,
              alignment: Alignment.centerRight,
              padding: const EdgeInsets.only(right: 20),
              child: Icon(
                viewMode == NoteViewMode.trash
                    ? Icons.restore
                    : (note.isArchived ? Icons.unarchive : Icons.archive),
                color: Colors.white,
              ),
            ),
            onDismissed: (direction) async {
              if (direction == DismissDirection.startToEnd) {
                await onDelete(note);
              } else {
                if (viewMode == NoteViewMode.trash) {
                  await onRestore?.call(note);
                } else {
                  await onToggleArchive(note);
                }
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
                  color: note.isArchived || note.isDeleted
                      ? Colors.grey
                      : (note.isDone
                          ? Colors.grey
                          : AppTheme.neutral.withValues(alpha: 0.9)),
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
                  if (viewMode == NoteViewMode.trash) ...[
                    IconButton(
                      tooltip: strings.restore,
                      icon: const Icon(
                        Icons.restore,
                        size: 16,
                        color: Colors.green,
                      ),
                      onPressed: () => onRestore?.call(note),
                    ),
                    IconButton(
                      tooltip: strings.permanentlyDelete,
                      icon: const Icon(
                        Icons.delete_forever,
                        size: 16,
                        color: Colors.red,
                      ),
                      onPressed: () => onDelete(note),
                    ),
                  ] else ...[
                    IconButton(
                      tooltip: strings.edit,
                      icon: const Icon(Icons.edit, size: 16),
                      onPressed: () => onEdit(note),
                    ),
                    if (viewMode == NoteViewMode.active)
                      IconButton(
                        tooltip: note.isPinned
                            ? strings.unpinNote
                            : strings.pinNote,
                        icon: Icon(
                          note.isPinned
                              ? Icons.push_pin
                              : Icons.push_pin_outlined,
                          size: 16,
                          color: note.isPinned
                              ? AppTheme.primary
                              : Colors.grey,
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
                        color: note.isDone
                            ? Colors.green
                            : AppTheme.neutral.withValues(alpha: 0.65),
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
                  ],
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
