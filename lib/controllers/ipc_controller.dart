import 'package:flutter/foundation.dart';

class IpcController {
  IpcController._();

  static final IpcController instance = IpcController._();

  final Map<String, ValueNotifier<int>> _refreshTicks = {};
  final Map<String, ValueNotifier<int>> _closeTicks = {};

  ValueNotifier<int> refreshTick(String scope) {
    return _refreshTicks.putIfAbsent(scope, () => ValueNotifier<int>(0));
  }

  ValueNotifier<int> closeTick(String scope) {
    return _closeTicks.putIfAbsent(scope, () => ValueNotifier<int>(0));
  }

  void requestRefresh(String scope) {
    refreshTick(scope).value++;
  }

  void requestClose(String scope) {
    closeTick(scope).value++;
  }
}
