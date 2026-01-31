import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../l10n/strings.dart';
import '../../models/note_model.dart';
import '../../theme/app_theme.dart';

typedef NoteAction = Future<void> Function(Note note);
typedef ReorderCallback = void Function(int oldIndex, int newIndex);

class PanelNotesList extends StatelessWidget {
  final List<Note> notes;
  final NoteAction onEdit;
  final NoteAction onDelete;
  final NoteAction onTogglePin;
  final NoteAction onToggleDone;
  final NoteAction onToggleArchive;
  final NoteAction onToggleZOrder;
  final NoteAction? onRestore;
  final ReorderCallback onReorder;
  final NoteViewMode viewMode;
  final bool canReorder;
  final Strings strings;

  const PanelNotesList({
    super.key,
    required this.notes,
    required this.onEdit,
    required this.onDelete,
    required this.onTogglePin,
    required this.onToggleDone,
    required this.onToggleArchive,
    required this.onToggleZOrder,
    this.onRestore,
    required this.onReorder,
    required this.viewMode,
    required this.canReorder,
    required this.strings,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: ReorderableListView.builder(
        itemCount: notes.length,
        onReorder: onReorder,
        buildDefaultDragHandles: false,
        proxyDecorator: (child, index, animation) {
          // Give a subtle "lift" while dragging (desktop-friendly).
          return AnimatedBuilder(
            animation: animation,
            child: child,
            builder: (context, child) {
              final t = Curves.easeOut.transform(animation.value);
              final scale = 1.0 + 0.03 * t;
              return Transform.scale(
                scale: scale,
                child: Material(
                  elevation: 6 * t,
                  color: Colors.transparent,
                  shadowColor: Colors.black54,
                  borderRadius: BorderRadius.circular(10),
                  child: child,
                ),
              );
            },
          );
        },
        itemBuilder: (context, index) {
          final note = notes[index];
          final reorderHandle = canReorder
              ? Tooltip(
                  message: strings.dragToReorder,
                  child: ReorderableDragStartListener(
                    index: index,
                    child: const _DragHandle(),
                  ),
                )
              : null;
          final tile = _NoteListItem(
            note: note,
            strings: strings,
            viewMode: viewMode,
            onEdit: () => onEdit(note),
            onDelete: () => onDelete(note),
            onRestore: () => onRestore?.call(note),
            onTogglePin: () => onTogglePin(note),
            onToggleZOrder: () => onToggleZOrder(note),
            onToggleDone: () => onToggleDone(note),
            onToggleArchive: () => onToggleArchive(note),
            reorderHandle: reorderHandle,
          );
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
            child: tile,
          );
        },
      ),
    );
  }
}

class _DragHandle extends StatelessWidget {
  const _DragHandle();

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.grab,
      child: Padding(
        padding: const EdgeInsets.only(left: 2, right: 2, top: 2),
        child: Icon(
          Icons.drag_indicator,
          size: 16,
          color: Colors.black45,
        ),
      ),
    );
  }
}

class _TinyIconButton extends StatelessWidget {
  const _TinyIconButton({
    required this.tooltip,
    required this.icon,
    this.color,
    required this.onPressed,
  });

  final String tooltip;
  final IconData icon;
  final Color? color;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      onPressed: onPressed,
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
      icon: Icon(icon, size: 15, color: color),
    );
  }
}

class _NoteListItem extends StatelessWidget {
  const _NoteListItem({
    required this.note,
    required this.strings,
    required this.viewMode,
    required this.onEdit,
    required this.onDelete,
    required this.onRestore,
    required this.onTogglePin,
    required this.onToggleZOrder,
    required this.onToggleDone,
    required this.onToggleArchive,
    required this.reorderHandle,
  });

  final Note note;
  final Strings strings;
  final NoteViewMode viewMode;

  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onRestore;
  final VoidCallback onTogglePin;
  final VoidCallback onToggleZOrder;
  final VoidCallback onToggleDone;
  final VoidCallback onToggleArchive;
  final Widget? reorderHandle;

  @override
  Widget build(BuildContext context) {
    final titleStyle = TextStyle(
      decoration: note.isDone ? TextDecoration.lineThrough : null,
      color: note.isArchived || note.isDeleted
          ? Colors.grey
          : (note.isDone
                ? Colors.grey
                : AppTheme.neutral.withValues(alpha: 0.9)),
      fontWeight: note.isPinned ? FontWeight.w700 : FontWeight.w500,
    );

    final actions = <Widget>[];
    if (viewMode == NoteViewMode.trash) {
      actions.addAll([
        _TinyIconButton(
          tooltip: strings.restore,
          icon: Icons.restore,
          color: Colors.green,
          onPressed: onRestore,
        ),
        _TinyIconButton(
          tooltip: strings.permanentlyDelete,
          icon: Icons.delete_forever,
          color: Colors.red,
          onPressed: onDelete,
        ),
      ]);
    } else {
      actions.add(
        _TinyIconButton(
          tooltip: strings.edit,
          icon: Icons.edit,
          onPressed: onEdit,
        ),
      );
      if (viewMode == NoteViewMode.active) {
        actions.add(
          _TinyIconButton(
            tooltip: note.isPinned ? strings.unpinNote : strings.pinNote,
            icon: note.isPinned ? Icons.push_pin : Icons.push_pin_outlined,
            color: note.isPinned ? AppTheme.primary : Colors.grey,
            onPressed: onTogglePin,
          ),
        );
      }
      if (viewMode == NoteViewMode.active && note.isPinned) {
        actions.add(
          _TinyIconButton(
            tooltip: note.isAlwaysOnTop ? strings.pinToBottom : strings.pinToTop,
            icon: note.isAlwaysOnTop
                ? Icons.vertical_align_top
                : Icons.vertical_align_bottom,
            color: note.isAlwaysOnTop ? AppTheme.primary : Colors.grey,
            onPressed: onToggleZOrder,
          ),
        );
      }
      actions.add(
        _TinyIconButton(
          tooltip: note.isDone ? strings.markUndone : strings.markDone,
          icon: note.isDone ? Icons.check_circle : Icons.check_circle_outline,
          color: note.isDone
              ? Colors.green
              : AppTheme.neutral.withValues(alpha: 0.65),
          onPressed: onToggleDone,
        ),
      );
      actions.add(
        _TinyIconButton(
          tooltip: note.isArchived ? strings.unarchive : strings.archive,
          icon: note.isArchived ? Icons.unarchive : Icons.archive,
          onPressed: onToggleArchive,
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  note.text,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: titleStyle,
                ),
                const SizedBox(height: 4),
                Text(
                  DateFormat('MM-dd HH:mm').format(note.updatedAt),
                  style: const TextStyle(fontSize: 10),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 148,
            child: Align(
              alignment: Alignment.topRight,
              child: Wrap(
                spacing: 0,
                runSpacing: 0,
                children: actions,
              ),
            ),
          ),
          if (reorderHandle != null) ...[
            const SizedBox(width: 6),
            reorderHandle!,
          ],
        ],
      ),
    );
  }
}
