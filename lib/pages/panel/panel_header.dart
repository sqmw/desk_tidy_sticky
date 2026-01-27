import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';

import '../../l10n/strings.dart';
import '../../models/note_model.dart';
import '../../services/overlay_process_manager.dart';
import '../../theme/app_theme.dart';

class PanelHeader extends StatelessWidget {
  final TextEditingController newNoteController;
  final TextEditingController searchController;
  final FocusNode focusNode;
  final Strings strings;
  final bool hideAfterSave;
  final ValueChanged<bool> onHideAfterSaveChanged;
  final NoteViewMode viewMode;
  final ValueChanged<NoteViewMode> onViewModeChanged;
  final NoteSortMode sortMode;
  final ValueChanged<NoteSortMode> onSortModeChanged;
  final bool windowPinned;
  final VoidCallback onToggleWindowPinned;
  final VoidCallback onHideWindow;
  final VoidCallback onToggleLanguage;
  final VoidCallback onSave;
  final VoidCallback onOpenOverlay;
  final VoidCallback onEmptyTrash;

  const PanelHeader({
    super.key,
    required this.newNoteController,
    required this.searchController,
    required this.focusNode,
    required this.strings,
    required this.hideAfterSave,
    required this.onHideAfterSaveChanged,
    required this.viewMode,
    required this.onViewModeChanged,
    required this.sortMode,
    required this.onSortModeChanged,
    required this.windowPinned,
    required this.onToggleWindowPinned,
    required this.onHideWindow,
    required this.onToggleLanguage,
    required this.onSave,
    required this.onOpenOverlay,
    required this.onEmptyTrash,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        border: const Border(bottom: BorderSide(color: AppTheme.divider)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          DragToMoveArea(
            child: Row(
              children: [
                Text(
                  strings.appName.toUpperCase(),
                  style: Theme.of(context).textTheme.titleMedium!.copyWith(
                        fontSize: 11,
                        letterSpacing: 0.6,
                        color: Colors.black54,
                      ),
                ),
                const Spacer(),
                _HeaderIcon(
                  tooltip: windowPinned
                      ? strings.unpinWindow
                      : strings.pinWindow,
                  icon: windowPinned ? Icons.push_pin : Icons.push_pin_outlined,
                  active: windowPinned,
                  activeColor: Colors.blue,
                  onPressed: onToggleWindowPinned,
                ),
                _HeaderIcon(
                  tooltip: strings.language,
                  icon: Icons.translate,
                  onPressed: onToggleLanguage,
                ),
                _HeaderIcon(
                  tooltip: strings.hideWindow,
                  icon: Icons.close,
                  onPressed: onHideWindow,
                ),
              ],
            ),
          ),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: newNoteController,
                  focusNode: focusNode,
                  style: Theme.of(context).textTheme.bodyMedium,
                  decoration: InputDecoration(
                    hintText: strings.inputHint,
                    hintStyle: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: Colors.grey),
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 6),
                  ),
                  onSubmitted: (_) => onSave(),
                ),
              ),
              IconButton(
                icon: const Icon(
                  Icons.send_rounded,
                  size: 20,
                  color: AppTheme.primary,
                ),
                onPressed: onSave,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                tooltip: strings.saveNote,
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              // View Mode Tabs
              Container(
                height: 28,
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: AppTheme.pillRadius,
                  border: Border.all(color: AppTheme.divider),
                ),
                child: Row(
                  children: [
                    _MiniTab(
                      selected: viewMode == NoteViewMode.active,
                      label: strings.active,
                      onTap: () => onViewModeChanged(NoteViewMode.active),
                    ),
                    _MiniTab(
                      selected: viewMode == NoteViewMode.archived,
                      label: strings.archived,
                      onTap: () => onViewModeChanged(NoteViewMode.archived),
                    ),
                    _MiniTab(
                      selected: viewMode == NoteViewMode.trash,
                      label: strings.trash,
                      onTap: () => onViewModeChanged(NoteViewMode.trash),
                    ),
                  ],
                ),
              ),
              if (viewMode == NoteViewMode.trash) ...[
                const SizedBox(width: 4),
                _HeaderIcon(
                  tooltip: strings.emptyTrash,
                  icon: Icons.delete_sweep_outlined,
                  onPressed: onEmptyTrash,
                ),
              ],
              const SizedBox(width: 8),
              // Sort Menu
              _SortButton(
                mode: sortMode,
                strings: strings,
                onSelected: onSortModeChanged,
              ),
              const Spacer(),
              // Hide Toggle
              _CompactToggle(
                value: hideAfterSave,
                tooltip: strings.hideAfterSave,
                onChanged: onHideAfterSaveChanged,
              ),
              const SizedBox(width: 8),
              // Sticker Toggle
              ValueListenableBuilder<bool>(
                valueListenable:
                    OverlayProcessManager.instance.isRunningNotifier,
                builder: (context, isRunning, _) {
                  return _HeaderIcon(
                    tooltip: strings.overlay,
                    icon: Icons.desktop_windows,
                    active: isRunning,
                    activeColor: Colors.blue,
                    size: 16,
                    onPressed: onOpenOverlay,
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 6),
          // Search Bar
          Container(
            height: 28,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppTheme.divider),
            ),
            child: Row(
              children: [
                const Icon(Icons.search, size: 14, color: Colors.grey),
                const SizedBox(width: 6),
                Expanded(
                  child: TextField(
                    controller: searchController,
                    style: const TextStyle(fontSize: 12),
                    decoration: InputDecoration(
                      hintText: strings.searchHint,
                      hintStyle: const TextStyle(
                        fontSize: 12,
                        color: Colors.grey,
                      ),
                      border: InputBorder.none,
                      isDense: true,
                    ),
                  ),
                ),
                if (searchController.text.isNotEmpty)
                  _HeaderIcon(
                    icon: Icons.close,
                    size: 14,
                    onPressed: () => searchController.clear(),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeaderIcon extends StatelessWidget {
  final IconData icon;
  final String? tooltip;
  final VoidCallback onPressed;
  final bool active;
  final Color? activeColor;
  final double size;

  const _HeaderIcon({
    required this.icon,
    required this.onPressed,
    this.tooltip,
    this.active = false,
    this.activeColor,
    this.size = 14,
  });

  @override
  Widget build(BuildContext context) {
    return IconButton(
      padding: const EdgeInsets.all(4),
      constraints: const BoxConstraints(),
      tooltip: tooltip,
      onPressed: onPressed,
      icon: Icon(
        icon,
        size: size,
        color: active
            ? (activeColor ?? Theme.of(context).colorScheme.primary)
            : Colors.black26,
      ),
    );
  }
}

class _MiniTab extends StatelessWidget {
  final bool selected;
  final String label;
  final VoidCallback onTap;

  const _MiniTab({
    required this.selected,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected
              ? Theme.of(context).colorScheme.primary
              : Colors.transparent,
          borderRadius: BorderRadius.circular(3),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 1,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: selected ? Colors.white : Colors.black54,
            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

class _SortButton extends StatelessWidget {
  final NoteSortMode mode;
  final Strings strings;
  final ValueChanged<NoteSortMode> onSelected;

  const _SortButton({
    required this.mode,
    required this.strings,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<NoteSortMode>(
      onSelected: onSelected,
      tooltip: strings.sortMode,
      offset: const Offset(0, 30),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[200]!),
          borderRadius: BorderRadius.circular(4),
        ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
            Icon(
              mode == NoteSortMode.custom
                  ? Icons.sort
                  : (mode == NoteSortMode.newest
                        ? Icons.arrow_downward
                        : Icons.arrow_upward),
              size: 12,
              color: Colors.black54,
            ),
            const SizedBox(width: 4),
            Text(
              mode == NoteSortMode.custom
                  ? strings.sortByCustom
                  : (mode == NoteSortMode.newest
                        ? strings.sortByNewest
                        : strings.sortByOldest),
              style: const TextStyle(fontSize: 10, color: Colors.black54),
            ),
            const Icon(Icons.arrow_drop_down, size: 14, color: Colors.black54),
          ],
        ),
      ),
      itemBuilder: (context) => [
        _buildItem(NoteSortMode.custom, strings.sortByCustom, Icons.sort),
        _buildItem(
          NoteSortMode.newest,
          strings.sortByNewest,
          Icons.arrow_downward,
        ),
        _buildItem(
          NoteSortMode.oldest,
          strings.sortByOldest,
          Icons.arrow_upward,
        ),
      ],
    );
  }

  PopupMenuItem<NoteSortMode> _buildItem(
    NoteSortMode value,
    String label,
    IconData icon,
  ) {
    return PopupMenuItem(
      value: value,
      height: 32,
      child: Row(
        children: [
          Icon(icon, size: 14, color: Colors.black54),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}

class _CompactToggle extends StatelessWidget {
  final bool value;
  final String tooltip;
  final ValueChanged<bool> onChanged;

  const _CompactToggle({
    required this.value,
    required this.tooltip,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: () => onChanged(!value),
        child: SizedBox(
          height: 16,
          width: 28,
          child: Transform.scale(
            scale: 0.7,
            child: Switch(
              value: value,
              onChanged: onChanged,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
        ),
      ),
    );
  }
}
