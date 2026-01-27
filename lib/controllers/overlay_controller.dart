import 'package:flutter/foundation.dart';

class OverlayController {
  OverlayController._();

  static final OverlayController instance = OverlayController._();

  final ValueNotifier<bool> clickThrough = ValueNotifier<bool>(false);

  void setClickThrough(bool value) {
    if (clickThrough.value == value) return;
    clickThrough.value = value;
  }

  void toggleClickThrough() {
    clickThrough.value = !clickThrough.value;
  }
}
