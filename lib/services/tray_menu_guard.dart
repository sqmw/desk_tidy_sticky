import 'dart:async';
import 'package:flutter/foundation.dart';

class TrayMenuGuard {
  TrayMenuGuard._();

  static final TrayMenuGuard instance = TrayMenuGuard._();

  final ValueNotifier<bool> isMenuOpen = ValueNotifier(false);
  Timer? _timer;

  void markMenuOpen({Duration duration = const Duration(seconds: 2)}) {
    isMenuOpen.value = true;
    _timer?.cancel();
    _timer = Timer(duration, () {
      isMenuOpen.value = false;
    });
  }
}
