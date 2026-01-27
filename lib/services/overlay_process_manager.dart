import 'dart:convert';
import 'dart:io';

import '../controllers/locale_controller.dart';
import '../l10n/strings.dart';
import '../models/monitor_rect.dart';
import 'display_service.dart';

class OverlayProcessManager {
  OverlayProcessManager._();

  static final OverlayProcessManager instance = OverlayProcessManager._();

  final Map<int, Process> _processes = {};
  bool _clickThrough = true;

  bool get isRunning => _processes.isNotEmpty;

  Future<bool> startAll({
    required LocaleController localeController,
    required bool embedWorkerW,
    bool initialClickThrough = true,
  }) async {
    if (isRunning) return true;

    final monitors = DisplayService.getMonitors();
    if (monitors.isEmpty) return false;

    _clickThrough = initialClickThrough;
    for (final m in monitors) {
      final ok = await _startOne(
        monitor: m,
        locale: localeController.current,
        embedWorkerW: embedWorkerW,
        clickThrough: _clickThrough,
      );
      if (!ok) {
        await stopAll();
        return false;
      }
    }
    return true;
  }

  Future<void> stopAll() async {
    final procs = _processes.values.toList();
    _processes.clear();
    for (final p in procs) {
      await _killProcessTree(p.pid);
    }
  }

  Future<void> toggleClickThroughAll() async {
    _clickThrough = !_clickThrough;
    _broadcast({'cmd': 'set_click_through', 'value': _clickThrough});
  }

  void refreshAll() {
    _broadcast({'cmd': 'refresh_notes'});
  }

  void closeAll() {
    _broadcast({'cmd': 'close_overlay'});
  }

  Future<bool> _startOne({
    required MonitorRect monitor,
    required AppLocale locale,
    required bool embedWorkerW,
    required bool clickThrough,
  }) async {
    final exe = Platform.resolvedExecutable;
    final args = <String>[
      '--mode=overlay',
      '--child',
      '--monitor-rect=${monitor.toArg()}',
      '--parent-pid=$pid',
      if (embedWorkerW) '--embed-workerw',
    ];

    try {
      final proc = await Process.start(
        exe,
        args,
        mode: ProcessStartMode.detachedWithStdio,
      );
      _processes[monitor.monitorId] = proc;
      proc.exitCode.then((_) {
        _processes.remove(monitor.monitorId);
      });

      // Ensure overlay language matches panel language at startup.
      _send(proc, {
        'cmd': 'set_language',
        'value': locale == AppLocale.zh ? 'zh' : 'en',
      });

      _send(proc, {'cmd': 'set_click_through', 'value': clickThrough});

      // Fail fast if process exits immediately.
      final exited = await proc.exitCode
          .timeout(const Duration(milliseconds: 300), onTimeout: () => -1);
      if (exited != -1) {
        _processes.remove(monitor.monitorId);
        return false;
      }

      return true;
    } catch (_) {
      return false;
    }
  }

  void _broadcast(Map<String, Object?> msg) {
    for (final p in _processes.values) {
      _send(p, msg);
    }
  }

  void _send(Process process, Map<String, Object?> msg) {
    try {
      process.stdin.writeln(jsonEncode(msg));
    } catch (_) {
      // Ignore broken pipes; the process may have exited.
    }
  }

  Future<void> _killProcessTree(int targetPid) async {
    if (!Platform.isWindows) {
      Process.killPid(targetPid);
      return;
    }
    try {
      await Process.run('taskkill', ['/PID', '$targetPid', '/T', '/F']);
    } catch (_) {
      // best-effort
    }
  }
}
