import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';

import '../../l10n/strings.dart';
import 'panel_page.dart';

import '../../services/notes_service.dart';

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
  final VoidCallback onSaveAndPin;
  final VoidCallback onOpenOverlay;

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
    required this.onSaveAndPin,
    required this.onOpenOverlay,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        border: Border(bottom: BorderSide(color: Colors.grey[300]!)),
      ),
      child: Column(
        children: [
          DragToMoveArea(
            child: SizedBox(
              height: 28,
              child: Row(
                children: [
                  Text(
                    strings.appName,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.black54,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    tooltip: windowPinned
                        ? strings.unpinWindow
                        : strings.pinWindow,
                    onPressed: onToggleWindowPinned,
                    icon: Icon(
                      windowPinned ? Icons.push_pin : Icons.push_pin_outlined,
                      size: 16,
                    ),
                  ),
                  IconButton(
                    tooltip: strings.hideWindow,
                    onPressed: onHideWindow,
                    icon: const Icon(Icons.close, size: 16),
                  ),
                  IconButton(
                    tooltip: strings.language,
                    onPressed: onToggleLanguage,
                    icon: const Icon(Icons.translate, size: 16),
                  ),
                ],
              ),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: newNoteController,
                  focusNode: focusNode,
                  decoration: InputDecoration(
                    hintText: strings.inputHint,
                    border: InputBorder.none,
                    isDense: true,
                  ),
                  onSubmitted: (_) => onSave(),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.send, size: 20),
                onPressed: onSave,
                tooltip: strings.saveNoteAction,
              ),
            ],
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              TextButton.icon(
                onPressed: onSaveAndPin,
                icon: const Icon(Icons.push_pin, size: 16),
                label: Text(strings.saveAndPin),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Switch(
                    value: hideAfterSave,
                    onChanged: onHideAfterSaveChanged,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  Text(strings.hideAfterSave),
                ],
              ),
              SegmentedButton<NoteViewMode>(
                segments: [
                  ButtonSegment(
                    value: NoteViewMode.active,
                    icon: const Icon(Icons.note, size: 16),
                    label: Text(
                      strings.active,
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                  ButtonSegment(
                    value: NoteViewMode.archived,
                    icon: const Icon(Icons.archive, size: 16),
                    label: Text(
                      strings.archived,
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
                selected: {viewMode},
                showSelectedIcon: false,
                onSelectionChanged: (set) => onViewModeChanged(set.first),
              ),
              SegmentedButton<NoteSortMode>(
                segments: [
                  ButtonSegment(
                    value: NoteSortMode.custom,
                    label: Text(
                      strings.sortByCustom,
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                  ButtonSegment(
                    value: NoteSortMode.newest,
                    label: Text(
                      strings.sortByNewest,
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                  ButtonSegment(
                    value: NoteSortMode.oldest,
                    label: Text(
                      strings.sortByOldest,
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
                selected: {sortMode},
                showSelectedIcon: false,
                onSelectionChanged: (set) => onSortModeChanged(set.first),
              ),
              IconButton(
                tooltip: strings.overlay,
                icon: const Icon(Icons.desktop_windows, size: 18),
                onPressed: onOpenOverlay,
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: searchController,
                  decoration: InputDecoration(
                    hintText: strings.searchHint,
                    isDense: true,
                    prefixIcon: const Icon(Icons.search, size: 18),
                    suffixIcon: searchController.text.trim().isEmpty
                        ? null
                        : IconButton(
                            tooltip: strings.clear,
                            icon: const Icon(Icons.close, size: 18),
                            onPressed: () => searchController.clear(),
                          ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
