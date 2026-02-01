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
  final VoidCallback onSave;
  final VoidCallback onCancel;
  final Strings strings;
  final bool actionsVisible;
  final bool isEditing;
  final TextEditingController? textController;

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
    required this.onSave,
    required this.onCancel,
    required this.strings,
    this.actionsVisible = true,
    this.isEditing = false,
    this.textController,
  });

  @override
  Widget build(BuildContext context) {
    // If editing, header must be visible to show Save/Cancel.
    // Otherwise, follow the hover state.
    final showHeader = isEditing || actionsVisible;

    return GestureDetector(
      onPanUpdate: (details) => onDragUpdate(details.delta),
      onPanEnd: (_) => onDragEnd(),
      onDoubleTap: isEditing ? null : onEdit,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 180, maxWidth: 260),
        child: Container(
          decoration: NoteCardStyle.decoration(),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header with actions
              AnimatedSize(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOut,
                child: SizedBox(
                  height: showHeader ? 32 : 0,
                  child: IgnorePointer(
                    ignoring: !showHeader,
                    child: AnimatedOpacity(
                      opacity: showHeader ? 1 : 0,
                      duration: const Duration(milliseconds: 120),
                      curve: Curves.easeOut,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          const SizedBox(width: 8),
                          // Drag handle area (spacer)
                          Expanded(
                            child: GestureDetector(
                              behavior: HitTestBehavior.translucent,
                              onPanUpdate: (details) =>
                                  onDragUpdate(details.delta),
                              onPanEnd: (_) => onDragEnd(),
                            ),
                          ),
                          if (isEditing) ...[
                            IconButton(
                              tooltip: strings.saveNote,
                              onPressed: onSave,
                              icon: const Icon(Icons.check, size: 16),
                              color: Colors.green,
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              style: IconButton.styleFrom(
                                minimumSize: const Size(28, 28),
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                            const SizedBox(width: 4),
                            IconButton(
                              tooltip: strings.cancel,
                              onPressed: onCancel,
                              icon: const Icon(Icons.close, size: 16),
                              color: Colors.redAccent,
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              style: IconButton.styleFrom(
                                minimumSize: const Size(28, 28),
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                          ] else ...[
                            IconButton(
                              tooltip: strings.edit,
                              onPressed: onEdit,
                              icon: const Icon(Icons.edit, size: 16),
                              color: AppTheme.neutral,
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              style: IconButton.styleFrom(
                                minimumSize: const Size(28, 28),
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                            const SizedBox(width: 4),
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
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              style: IconButton.styleFrom(
                                minimumSize: const Size(28, 28),
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                            const SizedBox(width: 4),
                            IconButton(
                              tooltip: strings.unpinNote,
                              onPressed: onUnpin,
                              icon: const Icon(
                                Icons.push_pin_outlined,
                                size: 16,
                              ),
                              color: AppTheme.neutral.withValues(alpha: 0.8),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              style: IconButton.styleFrom(
                                minimumSize: const Size(28, 28),
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                            const SizedBox(width: 4),
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
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              style: IconButton.styleFrom(
                                minimumSize: const Size(28, 28),
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                            const SizedBox(width: 4),
                            IconButton(
                              tooltip: strings.delete,
                              onPressed: onDelete,
                              icon: const Icon(Icons.delete_outline, size: 16),
                              color: Colors.redAccent.withValues(alpha: 0.9),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              style: IconButton.styleFrom(
                                minimumSize: const Size(28, 28),
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                          ],
                          const SizedBox(width: 8),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(
                  left: 12,
                  right: 12,
                  bottom: 12,
                  top: 12,
                ),
                child: isEditing
                    ? TextField(
                        controller: textController,
                        autofocus: true,
                        maxLines: null,
                        style: NoteCardStyle.textStyle(false),
                        decoration: const InputDecoration(
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                        ),
                      )
                    : Text(
                        note.text,
                        style: NoteCardStyle.textStyle(note.isDone),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
