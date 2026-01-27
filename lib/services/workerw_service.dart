import 'dart:ffi';

import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart' as win32;

class WorkerWService {
  WorkerWService._();

  static int _workerw = 0;

  static bool attachToWorkerW(int hwnd) {
    print('WorkerWService: attachToWorkerW hwnd=$hwnd');
    return using((arena) {
      try {
        final progmanName = 'Progman'.toNativeUtf16(allocator: arena);
        final progman = win32.FindWindow(progmanName, nullptr);
        print('WorkerWService: progman=$progman');

        if (progman != 0) {
          final result = arena<IntPtr>();
          win32.SendMessageTimeout(
            progman,
            0x052C,
            0,
            0,
            win32.SMTO_NORMAL,
            1000,
            result,
          );
        }

        final workerw = _findWorkerW();
        print('WorkerWService: found workerw=$workerw');

        if (workerw != 0) {
          win32.SetParent(hwnd, workerw);
          win32.SetWindowPos(
            hwnd,
            win32.HWND_TOP,
            0,
            0,
            0,
            0,
            win32.SWP_NOSIZE | win32.SWP_NOMOVE | win32.SWP_SHOWWINDOW,
          );
          print('WorkerWService: Attached successfully');
          return true;
        }
        return false;
      } catch (e, st) {
        print('WorkerWService: Error attaching: $e\n$st');
        return false;
      }
    });
  }

  static int _findWorkerW() {
    _workerw = 0;

    final callback = Pointer.fromFunction<win32.WNDENUMPROC>(
      _enumWindowsProc,
      1,
    );
    win32.EnumWindows(callback, 0);

    return _workerw;
  }

  static int _enumWindowsProc(int hwnd, int lParam) {
    final shellView = win32.FindWindowEx(
      hwnd,
      0,
      win32.TEXT('SHELLDLL_DefView'),
      nullptr,
    );
    if (shellView != 0) {
      final nextWorker = win32.FindWindowEx(
        0,
        hwnd,
        win32.TEXT('WorkerW'),
        nullptr,
      );
      if (nextWorker != 0) {
        _workerw = nextWorker;
        return 0;
      }
    }
    return 1;
  }
}
