import 'package:flutter/material.dart';

import '../../l10n/strings.dart';
import '../../models/note_model.dart';
import '../../theme/app_theme.dart';
import '../../theme/note_card_style.dart';

class StickyNoteCard extends StatelessWidget {
  final Note note;
  final ValueChanged<Offset> onDragUpdate;
  final VoidCallback onDragEnd;
  final VoidCallback onDelete;
  final VoidCallback onDoneToggle;
  final VoidCallback onUnpin;
  final VoidCallback onToggleZOrder;
  final VoidCallback onEdit;
  final Strings strings;
  final bool actionsVisible;

  const StickyNoteCard({
    super.key,
    required this.note,
    required this.onDragUpdate,
    required this.onDragEnd,
    required this.onDelete,
    required this.onDoneToggle,
    required this.onUnpin,
    required this.onToggleZOrder,
    required this.onEdit,
    required this.strings,
    this.actionsVisible = true,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanUpdate: (details) => onDragUpdate(details.delta),
      onPanEnd: (_) => onDragEnd(),
      onDoubleTap: onEdit,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 180, maxWidth: 260),
        child: Container(
          decoration: NoteCardStyle.decoration(),
          padding: const EdgeInsets.all(12),
          child: Stack(
            children: [
              Text(note.text, style: NoteCardStyle.textStyle(note.isDone)),
              Positioned(
                bottom: 0,
                right: 0,
                child: IgnorePointer(
                  ignoring: !actionsVisible,
                  child: AnimatedOpacity(
                    opacity: actionsVisible ? 1 : 0,
                    duration: const Duration(milliseconds: 120),
                    curve: Curves.easeOut,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        IconButton(
                          tooltip: strings.edit,
                          onPressed: onEdit,
                          icon: const Icon(Icons.edit, size: 16),
                          color: AppTheme.neutral,
                        ),
                        IconButton(
                          tooltip: note.isDone
                              ? strings.markUndone
                              : strings.markDone,
                          onPressed: onDoneToggle,
                          icon: Icon(
                            note.isDone
                                ? Icons.check_circle
                                : Icons.check_circle_outline,
                            size: 16,
                            color: note.isDone
                                ? Colors.green
                                : AppTheme.neutral.withValues(alpha: 0.65),
                          ),
                        ),
                        IconButton(
                          tooltip: strings.unpinNote,
                          onPressed: onUnpin,
                          icon: const Icon(Icons.push_pin_outlined, size: 16),
                          color: AppTheme.neutral.withValues(alpha: 0.8),
                        ),
                        IconButton(
                          tooltip: note.isAlwaysOnTop
                              ? strings.pinToBottom
                              : strings.pinToTop,
                          onPressed: onToggleZOrder,
                          icon: Icon(
                            note.isAlwaysOnTop
                                ? Icons.vertical_align_top
                                : Icons.vertical_align_bottom,
                            size: 16,
                            color: note.isAlwaysOnTop
                                ? AppTheme.primary
                                : AppTheme.neutral,
                          ),
                        ),
                        IconButton(
                          tooltip: strings.delete,
                          onPressed: onDelete,
                          icon: const Icon(Icons.delete_outline, size: 16),
                          color: Colors.redAccent.withValues(alpha: 0.9),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
