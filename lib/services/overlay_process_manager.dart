import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../controllers/ipc_controller.dart';
import '../controllers/locale_controller.dart';
import '../controllers/overlay_controller.dart';
import '../models/note_model.dart';
import '../models/monitor_rect.dart';
import 'display_service.dart';

class OverlayProcessManager {
  static final OverlayProcessManager instance = OverlayProcessManager._();

  OverlayProcessManager._() {
    OverlayController.instance.clickThrough.addListener(
      _handleClickThroughChanged,
    );
  }

  final Map<int, Process> _processes = {};
  bool _clickThrough = true;

  final ValueNotifier<bool> isRunningNotifier = ValueNotifier<bool>(false);
  bool get isRunning => isRunningNotifier.value;

  Future<bool> startAll({
    required LocaleController localeController,
    required bool embedWorkerW,
    bool initialClickThrough = true,
  }) async {
    if (isRunning) return true;

    final monitors = DisplayService.getMonitors();
    if (monitors.isEmpty) return false;

    print('OverlayProcessManager: startAll count=${monitors.length}');
    _clickThrough = initialClickThrough;
    for (final m in monitors) {
      final ok = await _startOne(
        monitor: m,
        locale: localeController.current,
        embedWorkerW: embedWorkerW,
        clickThrough: _clickThrough,
      );
      if (!ok) {
        print(
          'OverlayProcessManager: _startOne failed for monitor ${m.monitorId}',
        );
        await stopAll();
        return false;
      }
    }
    isRunningNotifier.value = _processes.isNotEmpty;
    return true;
  }

  Future<void> stopAll() async {
    final procs = _processes.values.toList();
    _processes.clear();
    for (final p in procs) {
      await _killProcessTree(p.pid);
    }
    isRunningNotifier.value = false;
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

    print('OverlayProcessManager: Starting child: $exe ${args.join(' ')}');
    try {
      final proc = await Process.start(
        exe,
        args,
        mode: ProcessStartMode.detachedWithStdio,
        workingDirectory: File(exe).parent.path,
      );
      _processes[monitor.monitorId] = proc;
      print(
        'OverlayProcessManager: Started process pid=${proc.pid} for monitor ${monitor.monitorId}',
      );

      // Capture child output
      proc.stdout
          .transform(utf8.decoder)
          .transform(const LineSplitter())
          .listen((line) {
            if (line.startsWith('IPC_JSON:')) {
              final jsonStr = line.substring('IPC_JSON:'.length);
              try {
                final data = jsonDecode(jsonStr);
                if (data is Map) {
                  final cmd = data['cmd'];
                  if (cmd == 'refresh_notes') {
                    IpcController.instance.requestRefresh();
                  }
                }
              } catch (_) {
                print(
                  'OverlayProcessManager: Failed to parse IPC JSON: $jsonStr',
                );
              }
            } else {
              print('[Child ${proc.pid} STDOUT]: ${line.trim()}');
            }
          });
      proc.stderr
          .transform(utf8.decoder)
          .transform(const LineSplitter())
          .listen((line) {
            print('[Child ${proc.pid} STDERR]: ${line.trim()}');
          });

      // Note: proc.exitCode is NOT available for detached processes in Dart.
      // We rely on external tracking or assume it's running.

      // Ensure overlay language matches panel language at startup.
      _send(proc, {
        'cmd': 'set_language',
        'value': locale == AppLocale.zh ? 'zh' : 'en',
      });

      _send(proc, {'cmd': 'set_click_through', 'value': clickThrough});

      return true;
    } catch (e, st) {
      print('OverlayProcessManager: Error starting process: $e\n$st');
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

  void _handleClickThroughChanged() {
    _clickThrough = OverlayController.instance.clickThrough.value;
    _broadcast({'cmd': 'set_click_through', 'value': _clickThrough});
  }
}
