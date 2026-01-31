import 'package:flutter/foundation.dart';
import 'package:desktop_multi_window/desktop_multi_window.dart';

import '../controllers/locale_controller.dart';
import '../controllers/overlay_controller.dart';
import '../models/window_args.dart';
import 'notes_service.dart';
import 'window_message_service.dart';

/// Manages one native window per pinned note (Scheme C).
class StickyNoteWindowManager {
  StickyNoteWindowManager._() {
    OverlayController.instance.clickThrough.addListener(
      _handleClickThroughChanged,
    );
  }

  static final StickyNoteWindowManager instance = StickyNoteWindowManager._();

  final NotesService _notesService = NotesService();
  final Map<String, WindowController> _noteWindows = {};

  bool _clickThrough = true;
  bool _enabled = false;

  final ValueNotifier<bool> isRunningNotifier = ValueNotifier<bool>(false);
  bool get isRunning => isRunningNotifier.value;

  Future<bool> start({
    required LocaleController localeController,
    required bool embedWorkerW,
    bool initialClickThrough = true,
  }) async {
    if (_enabled) return true;
    _enabled = true;
    _clickThrough = initialClickThrough;
    OverlayController.instance.setClickThrough(_clickThrough);

    // If the app was restarted or hot-reloaded while note windows were still
    // alive, we may have orphaned duplicates. Recover what we can and close the rest.
    await _recoverExistingWindows();

    await sync(localeController: localeController, embedWorkerW: embedWorkerW);
    // Best-effort retry: new windows may not be fully ready immediately after
    // creation; a delayed sync helps avoid "enabled but nothing shows" reports.
    Future.delayed(const Duration(milliseconds: 350), () {
      if (_enabled) {
        sync(localeController: localeController, embedWorkerW: embedWorkerW);
      }
    });
    isRunningNotifier.value = true;
    return true;
  }

  Future<void> stop() async {
    if (!_enabled) return;
    _enabled = false;
    await _closeAllNoteWindows();
    _noteWindows.clear();
    isRunningNotifier.value = false;
  }

  Future<void> toggleClickThrough() async {
    OverlayController.instance.toggleClickThrough();
  }

  Future<void> refreshAll() async {
    // Note windows will reload from disk.
    await WindowMessageService.instance.sendToAll('refresh_notes');
  }

  Future<void> sync({
    required LocaleController localeController,
    required bool embedWorkerW,
  }) async {
    if (!_enabled) return;

    await _notesService.loadNotes();
    final pinned = _notesService.notes
        .where((n) => n.isPinned && !n.isArchived && !n.isDeleted)
        .toList();

    final desiredIds = pinned.map((n) => n.id).toSet();
    final existingIds = _noteWindows.keys.toSet();

    // Close windows that are no longer needed.
    for (final id in existingIds.difference(desiredIds)) {
      final controller = _noteWindows.remove(id);
      if (controller == null) continue;
      try {
        await controller.invokeMethod('close_overlay');
      } catch (_) {
        // Best-effort
      }
    }

    // Create missing windows.
    for (final note in pinned) {
      if (_noteWindows.containsKey(note.id)) continue;
      final controller = await _createNoteWindow(
        noteId: note.id,
        embedWorkerW: embedWorkerW,
      );
      if (controller != null) {
        _noteWindows[note.id] = controller;
      }
    }

    await WindowMessageService.instance.sendToAll(
      'set_language',
      {'value': localeController.current.name},
    );
    await WindowMessageService.instance.sendToAll(
      'set_click_through',
      {'value': _clickThrough},
    );
  }

  Future<void> _recoverExistingWindows() async {
    final controllers = await WindowController.getAll();

    // Keep the first window per noteId, close duplicates.
    final seen = <String, WindowController>{};
    final duplicates = <WindowController>[];

    for (final controller in controllers) {
      final args = WindowArgs.fromJsonString(controller.arguments);

      // Legacy full-screen overlay windows should be closed in Scheme C.
      if (args.type == AppWindowType.overlay) {
        duplicates.add(controller);
        continue;
      }

      if (args.type != AppWindowType.note) continue;
      final noteId = args.noteId;
      if (noteId == null || noteId.trim().isEmpty) continue;

      final existing = seen[noteId];
      if (existing == null) {
        seen[noteId] = controller;
      } else {
        duplicates.add(controller);
      }
    }

    // Adopt survivors.
    _noteWindows
      ..clear()
      ..addAll(seen);

    // Close duplicates (best-effort).
    for (final controller in duplicates) {
      try {
        await controller.invokeMethod('close_overlay');
      } catch (_) {}
    }
  }

  Future<WindowController?> _createNoteWindow({
    required String noteId,
    required bool embedWorkerW,
  }) async {
    try {
      final args = WindowArgs.note(
        noteId: noteId,
        embedWorkerW: embedWorkerW,
      );
      final controller = await WindowController.create(
        WindowConfiguration(hiddenAtLaunch: true, arguments: args.toJsonString()),
      );
      await controller.show();
      _kickWindow(controller);
      return controller;
    } catch (_) {
      return null;
    }
  }

  void _kickWindow(WindowController controller) {
    // Some systems need an extra show/refresh cycle to surface a newly-created
    // transparent window (especially when immediately reparenting to WorkerW).
    Future.delayed(const Duration(milliseconds: 150), () async {
      try {
        await controller.show();
        await controller.invokeMethod('refresh_notes');
      } catch (_) {}
    });
    Future.delayed(const Duration(milliseconds: 400), () async {
      try {
        await controller.show();
        await controller.invokeMethod('refresh_notes');
      } catch (_) {}
    });
  }

  Future<void> _closeAllNoteWindows() async {
    for (final controller in _noteWindows.values) {
      try {
        await controller.invokeMethod('close_overlay');
      } catch (_) {}
    }
  }

  void _handleClickThroughChanged() {
    if (!_enabled) return;
    _clickThrough = OverlayController.instance.clickThrough.value;
    WindowMessageService.instance.sendToAll(
      'set_click_through',
      {'value': _clickThrough},
    );
  }
}
