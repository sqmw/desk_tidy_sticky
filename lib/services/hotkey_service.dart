/// Global Hotkey Service (simplified polling)
/// Mirrors desk_tidy approach: poll GetAsyncKeyState on a short interval.
library;

import 'dart:async';
import 'dart:developer' as dev;

import 'package:win32/win32.dart';
import '../controllers/overlay_controller.dart';
import 'sticky_note_window_manager.dart';
import 'panel_window_service.dart';

/// Hotkey configuration data.
class HotkeyConfig {
  final int vkCtrl;
  final int vkShift;
  final int vkAlt;
  final int vkKey;
  final String description;

  const HotkeyConfig({
    required this.vkCtrl,
    required this.vkShift,
    required this.vkAlt,
    required this.vkKey,
    this.description = '',
  });

  /// Default toggle: Ctrl + Shift + N
  static const togglePanel = HotkeyConfig(
    vkCtrl: 1,
    vkShift: 1,
    vkAlt: 0,
    vkKey: 0x4E, // N key
    description: 'Ctrl + Shift + N',
  );

  /// Default overlay click-through toggle: Ctrl + Shift + O
  static const toggleOverlayClickThrough = HotkeyConfig(
    vkCtrl: 1,
    vkShift: 1,
    vkAlt: 0,
    vkKey: 0x4F, // O key
    description: 'Ctrl + Shift + O',
  );

  /// Check if this hotkey combination is currently pressed.
  bool isPressed() {
    const downMask = 0x8000;

    if (vkCtrl == 1) {
      final ctrlPressed =
          (GetAsyncKeyState(VK_CONTROL) & downMask) != 0 ||
          (GetAsyncKeyState(VK_LCONTROL) & downMask) != 0 ||
          (GetAsyncKeyState(VK_RCONTROL) & downMask) != 0;
      if (!ctrlPressed) return false;
    }

    if (vkShift == 1) {
      final shiftPressed =
          (GetAsyncKeyState(VK_SHIFT) & downMask) != 0 ||
          (GetAsyncKeyState(VK_LSHIFT) & downMask) != 0 ||
          (GetAsyncKeyState(VK_RSHIFT) & downMask) != 0;
      if (!shiftPressed) return false;
    }

    if (vkAlt == 1) {
      final altPressed =
          (GetAsyncKeyState(VK_MENU) & downMask) != 0 ||
          (GetAsyncKeyState(VK_LMENU) & downMask) != 0 ||
          (GetAsyncKeyState(VK_RMENU) & downMask) != 0;
      if (!altPressed) return false;
    }

    return (GetAsyncKeyState(vkKey) & downMask) != 0;
  }
}

typedef HotkeyCallback = void Function(HotkeyConfig hotkey);

class HotkeyService {
  HotkeyService._();

  static HotkeyService? _instance;
  static HotkeyService get instance => _instance ??= HotkeyService._();

  Timer? _timer;
  final List<HotkeyConfig> _hotkeys = [];
  final Map<HotkeyConfig, bool> _lastState = {};
  final Map<HotkeyConfig, HotkeyCallback> _callbacks = {};

  /// Initialize and register default hotkeys.
  Future<void> init() async {
    register(
      HotkeyConfig.togglePanel,
      callback: (hotkey) async {
        await PanelWindowService.toggle();
      },
    );
    register(
      HotkeyConfig.toggleOverlayClickThrough,
      callback: (_) async {
        final overlayManager = StickyNoteWindowManager.instance;
        if (overlayManager.isRunning) {
          await overlayManager.toggleClickThrough();
        } else {
          OverlayController.instance.toggleClickThrough();
        }
      },
    );
    startPolling();
  }

  void register(HotkeyConfig hotkey, {HotkeyCallback? callback}) {
    if (!_hotkeys.contains(hotkey)) {
      _hotkeys.add(hotkey);
      _lastState[hotkey] = false;
      // Keep logs ASCII to avoid encoding issues in terminal.
      dev.log(
        'Registered hotkey: ${hotkey.description}',
        name: 'HotkeyService',
      );
    }
    if (callback != null) {
      _callbacks[hotkey] = callback;
    }
  }

  void startPolling({Duration interval = const Duration(milliseconds: 100)}) {
    _timer?.cancel();
    _timer = Timer.periodic(interval, (_) => _pollHotkeys());
    dev.log('Hotkey polling started', name: 'HotkeyService');
  }

  void stopPolling() {
    _timer?.cancel();
    _timer = null;
  }

  void _pollHotkeys() {
    for (final hotkey in _hotkeys) {
      final isPressed = hotkey.isPressed();
      final wasPressed = _lastState[hotkey] ?? false;

      if (isPressed && !wasPressed) {
        _callbacks[hotkey]?.call(hotkey);
      }

      _lastState[hotkey] = isPressed;
    }
  }

  void dispose() {
    stopPolling();
    _hotkeys.clear();
    _lastState.clear();
    _callbacks.clear();
    _instance = null;
  }
}
