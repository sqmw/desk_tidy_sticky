import 'package:flutter/material.dart';

import '../../l10n/strings.dart';
import '../../models/note_model.dart';

class StickyNoteCard extends StatelessWidget {
  final Note note;
  final ValueChanged<Offset> onDragUpdate;
  final VoidCallback onDragEnd;
  final VoidCallback onDelete;
  final VoidCallback onDoneToggle;
  final VoidCallback onUnpin;
  final VoidCallback onEdit;
  final Strings strings;

  const StickyNoteCard({
    super.key,
    required this.note,
    required this.onDragUpdate,
    required this.onDragEnd,
    required this.onDelete,
    required this.onDoneToggle,
    required this.onUnpin,
    required this.onEdit,
    required this.strings,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanUpdate: (details) => onDragUpdate(details.delta),
      onPanEnd: (_) => onDragEnd(),
      onDoubleTap: onEdit,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 180, maxWidth: 260),
        child: Card(
          color: Colors.amber.shade100.withValues(alpha: 0.95),
          elevation: 3,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  note.text,
                  style: TextStyle(
                    color: Colors.brown[900],
                    fontWeight: FontWeight.w600,
                    decoration: note.isDone ? TextDecoration.lineThrough : null,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    IconButton(
                      tooltip: strings.edit,
                      onPressed: onEdit,
                      icon: const Icon(Icons.edit, size: 16),
                    ),
                    IconButton(
                      tooltip:
                          note.isDone ? strings.markUndone : strings.markDone,
                      onPressed: onDoneToggle,
                      icon: Icon(
                        note.isDone
                            ? Icons.check_circle
                            : Icons.check_circle_outline,
                        size: 16,
                        color: note.isDone ? Colors.green : Colors.grey[700],
                      ),
                    ),
                    IconButton(
                      tooltip: strings.unpinNote,
                      onPressed: onUnpin,
                      icon: const Icon(Icons.push_pin_outlined, size: 16),
                    ),
                    IconButton(
                      tooltip: strings.delete,
                      onPressed: onDelete,
                      icon: const Icon(Icons.delete_outline, size: 16),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
