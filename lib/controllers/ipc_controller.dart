import 'package:flutter/foundation.dart';

class IpcController {
  IpcController._();

  static final IpcController instance = IpcController._();

  final ValueNotifier<int> refreshTick = ValueNotifier<int>(0);
  final ValueNotifier<int> closeTick = ValueNotifier<int>(0);

  void requestRefresh() {
    refreshTick.value++;
  }

  void requestClose() {
    closeTick.value++;
  }
}

