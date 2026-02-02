import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:desktop_multi_window/desktop_multi_window.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

import '../controllers/locale_controller.dart';
import '../controllers/overlay_controller.dart';
import '../models/note_model.dart';
import '../models/window_args.dart';
import 'notes_service.dart';
import 'window_message_service.dart';
import 'log_service.dart';

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

  AppLocale? _lastLocaleBroadcast;
  bool? _lastClickThroughBroadcast;

  /// Returns the file where we map noteId -> windowId.
  Future<File> get _persistenceFile async {
    final appDocDir = await getApplicationSupportDirectory();
    final stickyDir = Directory(
      p.join(appDocDir.parent.path, 'desk_tidy_sticky'),
    );
    if (!await stickyDir.exists()) {
      await stickyDir.create(recursive: true);
    }
    return File(p.join(stickyDir.path, 'sticky_layout.json'));
  }

  Future<void> _saveWindowMap() async {
    try {
      final file = await _persistenceFile;
      final map = <String, dynamic>{};
      for (final entry in _noteWindows.entries) {
        map[entry.key] = entry.value.windowId;
      }
      await file.writeAsString(jsonEncode(map));
    } catch (e) {
      await LogService.error('Failed to save window map', e);
    }
  }

  Future<Map<String, dynamic>> _loadWindowMap() async {
    try {
      final file = await _persistenceFile;
      if (!await file.exists()) return {};
      final content = await file.readAsString();
      return jsonDecode(content) as Map<String, dynamic>;
    } catch (e) {
      await LogService.error('Failed to load window map', e);
      return {};
    }
  }

  Future<bool> start({
    required LocaleController localeController,
    required bool embedWorkerW,
    bool initialClickThrough = true,
  }) async {
    await LogService.info(
      '[StickyNoteManager] start() called. enabled=$_enabled',
    );
    if (_enabled) return true;
    _enabled = true;
    _clickThrough = initialClickThrough;
    OverlayController.instance.setClickThrough(_clickThrough);

    try {
      // Recovery phase
      await _recoverExistingWindows();

      // Sync phase (creates missing, closes removed)
      await sync(
        localeController: localeController,
        embedWorkerW: embedWorkerW,
      );

      // Startup Refresh: Ensure all windows (especially recovered ones) are consistent
      // This is moved out of sync() to prevent flashing during normal updates
      for (final controller in _noteWindows.values) {
        _kickWindow(
          controller,
          localeName: localeController.current.name,
          clickThrough: _clickThrough,
        );
      }

      await LogService.info(
        '[StickyNoteManager] Start complete. Windows: ${_noteWindows.length}',
      );

      // Best-effort delayed sync
      Future.delayed(const Duration(milliseconds: 350), () {
        if (_enabled) {
          sync(localeController: localeController, embedWorkerW: embedWorkerW);
        }
      });

      isRunningNotifier.value = true;
      return true;
    } catch (e, stack) {
      await LogService.error('Start failed', e, stack);
      return false;
    }
  }

  Future<void> stop() async {
    await LogService.info(
      '[StickyNoteManager] stop() called. enabled=$_enabled',
    );
    if (!_enabled) return;
    _enabled = false;
    try {
      await _closeAllNoteWindows();
      _noteWindows.clear();
      await _saveWindowMap();
    } catch (e, stack) {
      await LogService.error('Stop failed during cleanup', e, stack);
    } finally {
      isRunningNotifier.value = false;
      await LogService.info('[StickyNoteManager] Stopped.');
    }
  }

  Future<void> toggleClickThrough() async {
    OverlayController.instance.toggleClickThrough();
  }

  Future<void> refreshAll() async {
    await WindowMessageService.instance.sendToAll('refresh_notes');
  }

  Future<void> refreshNote(String noteId) async {
    final controller = _noteWindows[noteId];
    if (controller == null) return;
    try {
      await controller.invokeMethod('refresh_notes');
    } catch (e) {
      await LogService.error('Failed to refresh note $noteId', e);
    }
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

    // Close windows
    for (final id in existingIds.difference(desiredIds)) {
      await LogService.info(
        '[StickyNoteManager] Sync: Closing unpinned note $id',
      );
      final controller = _noteWindows.remove(id);
      if (controller == null) continue;
      try {
        await controller.invokeMethod('close_overlay');
      } catch (e) {
        await LogService.error('Sync close failed for $id', e);
      }
    }

    // Create or Update windows
    for (final note in pinned) {
      if (_noteWindows.containsKey(note.id)) {
        // Window already exists. Do NOT kick it here.
        // This prevents global flashing when just one note changes (e.g. Z-order toggle).
        // Specific updates should be handled by the caller or specific triggers.
        continue;
      }

      await LogService.info(
        '[StickyNoteManager] Sync: Creating window for note ${note.id}',
      );
      final controller = await _createNoteWindow(
        noteId: note.id,
        embedWorkerW: embedWorkerW,
      );
      if (controller != null) {
        _noteWindows[note.id] = controller;
        _kickWindow(
          controller,
          localeName: localeController.current.name,
          clickThrough: _clickThrough,
        );
      }
    }

    await _saveWindowMap();

    // Broadcast state updates
    final localeNow = localeController.current;
    if (_lastLocaleBroadcast != localeNow) {
      _lastLocaleBroadcast = localeNow;
      await WindowMessageService.instance.sendToAll('set_language', {
        'value': localeNow.name,
      });
    }

    if (_lastClickThroughBroadcast != _clickThrough) {
      _lastClickThroughBroadcast = _clickThrough;
      await WindowMessageService.instance.sendToAll('set_click_through', {
        'value': _clickThrough,
      });
    }
  }

  Future<void> _recoverExistingWindows() async {
    await LogService.info('[StickyNoteManager] Recovering windows...');
    final controllers = await WindowController.getAll();
    final persistedMap = await _loadWindowMap();

    final Map<String, WindowController> availableControllers = {};

    // 1. Add reported windows (using String ID)
    for (final c in controllers) {
      availableControllers[c.windowId.toString()] = c;
    }

    // 2. Add persisted windows
    for (final entry in persistedMap.entries) {
      final idStr = entry.value.toString();
      if (!availableControllers.containsKey(idStr)) {
        try {
          availableControllers[idStr] = WindowController.fromWindowId(idStr);
          await LogService.info(
            '[StickyNoteManager] Recovered persisted window ID: $idStr for note ${entry.key}',
          );
        } catch (e) {
          await LogService.error('Failed to recover window $idStr', e);
        }
      }
    }

    // 3. Filter and Deduplicate
    final seen = <String, WindowController>{};
    final duplicates = <WindowController>[];

    for (final controller in availableControllers.values) {
      WindowArgs args;
      try {
        final argsString = await controller.arguments;
        if (argsString == null) continue;
        args = WindowArgs.fromJsonString(argsString);
      } catch (e) {
        continue;
      }

      if (args.type == AppWindowType.overlay) {
        duplicates.add(controller);
        continue;
      }

      if (args.type != AppWindowType.note) continue;
      final noteId = args.noteId;
      if (noteId == null || noteId.trim().isEmpty) continue;

      if (seen.containsKey(noteId)) {
        duplicates.add(controller);
      } else {
        seen[noteId] = controller;
      }
    }

    await LogService.info(
      '[StickyNoteManager] Recovery summary: ${seen.length} valid, ${duplicates.length} duplicates',
    );

    _noteWindows
      ..clear()
      ..addAll(seen);

    await _saveWindowMap();

    for (final controller in duplicates) {
      try {
        await LogService.info(
          '[StickyNoteManager] Closing duplicate window ${controller.windowId}',
        );
        await controller.invokeMethod('close_overlay');
      } catch (e) {
        // ignore
      }
    }
  }

  Future<WindowController?> _createNoteWindow({
    required String noteId,
    required bool embedWorkerW,
  }) async {
    try {
      final args = WindowArgs.note(noteId: noteId, embedWorkerW: embedWorkerW);
      final controller = await WindowController.create(
        WindowConfiguration(
          hiddenAtLaunch: true,
          arguments: args.toJsonString(),
        ),
      );
      // We start it hidden (show is called in _kickWindow or by the page itself via ZOrderService)
      // Actually, standard practice on windows: show() brings it to front.
      // We should rely on the Page to position itself Z-order wise.
      // But we call show() here to ensure it's not invisible.
      await controller.show();
      return controller;
    } catch (e, s) {
      await LogService.error('Failed to create note window', e, s);
      return null;
    }
  }

  void _kickWindow(
    WindowController controller, {
    required String localeName,
    required bool clickThrough,
  }) {
    // UPDATED: Removed repetitive `await controller.show()` calls.
    // Also removed redundant `refresh_notes` calls as NoteWindowPage loads data on initState.
    Future.delayed(const Duration(milliseconds: 150), () async {
      try {
        await controller.invokeMethod('set_language', {'value': localeName});
        await controller.invokeMethod('set_click_through', {
          'value': clickThrough,
        });
      } catch (_) {}
    });
    Future.delayed(const Duration(milliseconds: 400), () async {
      try {
        await controller.invokeMethod('set_language', {'value': localeName});
        await controller.invokeMethod('set_click_through', {
          'value': clickThrough,
        });
      } catch (_) {}
    });
  }

  Future<void> _closeAllNoteWindows() async {
    await LogService.info(
      '[StickyNoteManager] Closing all ${_noteWindows.length} windows',
    );
    for (final entry in _noteWindows.entries) {
      try {
        await entry.value.invokeMethod('close_overlay');
      } catch (e) {
        await LogService.error('Error closing window for note ${entry.key}', e);
      }
    }
  }

  void _handleClickThroughChanged() {
    if (!_enabled) return;
    _clickThrough = OverlayController.instance.clickThrough.value;
    if (_lastClickThroughBroadcast == _clickThrough) return;
    _lastClickThroughBroadcast = _clickThrough;
    WindowMessageService.instance.sendToAll('set_click_through', {
      'value': _clickThrough,
    });
  }
}
