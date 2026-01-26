import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';

import 'panel_page.dart';

class PanelHeader extends StatelessWidget {
  final TextEditingController newNoteController;
  final TextEditingController searchController;
  final FocusNode focusNode;
  final bool hideAfterSave;
  final ValueChanged<bool> onHideAfterSaveChanged;
  final NoteViewMode viewMode;
  final ValueChanged<NoteViewMode> onViewModeChanged;
  final bool windowPinned;
  final VoidCallback onToggleWindowPinned;
  final VoidCallback onHideWindow;
  final VoidCallback onSave;
  final VoidCallback onSaveAndPin;
  final VoidCallback onOpenOverlay;

  const PanelHeader({
    super.key,
    required this.newNoteController,
    required this.searchController,
    required this.focusNode,
    required this.hideAfterSave,
    required this.onHideAfterSaveChanged,
    required this.viewMode,
    required this.onViewModeChanged,
    required this.windowPinned,
    required this.onToggleWindowPinned,
    required this.onHideWindow,
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
                  const Text(
                    'Desk Tidy Sticky',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.black54,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    tooltip: windowPinned ? 'Unpin window' : 'Pin window',
                    onPressed: onToggleWindowPinned,
                    icon: Icon(
                      windowPinned ? Icons.push_pin : Icons.push_pin_outlined,
                      size: 16,
                    ),
                  ),
                  IconButton(
                    tooltip: 'Hide',
                    onPressed: onHideWindow,
                    icon: const Icon(Icons.close, size: 16),
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
                  decoration: const InputDecoration(
                    hintText: 'Type a note... (Enter to save)',
                    border: InputBorder.none,
                    isDense: true,
                  ),
                  onSubmitted: (_) => onSave(),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.send, size: 20),
                onPressed: onSave,
                tooltip: 'Save Note',
              ),
            ],
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              TextButton.icon(
                onPressed: onSaveAndPin,
                icon: const Icon(Icons.push_pin, size: 16),
                label: const Text('Save & pin'),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Switch(
                    value: hideAfterSave,
                    onChanged: onHideAfterSaveChanged,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  const Text('Hide after save'),
                ],
              ),
              SegmentedButton<NoteViewMode>(
                segments: const [
                  ButtonSegment(
                    value: NoteViewMode.active,
                    icon: Icon(Icons.note),
                    label: Text('Active'),
                  ),
                  ButtonSegment(
                    value: NoteViewMode.archived,
                    icon: Icon(Icons.archive),
                    label: Text('Archived'),
                  ),
                ],
                selected: {viewMode},
                showSelectedIcon: false,
                onSelectionChanged: (set) => onViewModeChanged(set.first),
              ),
              IconButton(
                tooltip: 'Desktop overlay',
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
                    hintText: 'Search (pinyin supported)...',
                    isDense: true,
                    prefixIcon: const Icon(Icons.search, size: 18),
                    suffixIcon: searchController.text.trim().isEmpty
                        ? null
                        : IconButton(
                            tooltip: 'Clear',
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
