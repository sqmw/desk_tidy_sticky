import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

class LogService {
  LogService._();
  static final LogService instance = LogService._();

  File? _logFile;

  Future<void> init() async {
    try {
      final dir = await getApplicationSupportDirectory();
      final logDir = Directory(p.join(dir.parent.path, 'desk_tidy_sticky'));
      if (!await logDir.exists()) await logDir.create(recursive: true);
      _logFile = File(p.join(logDir.path, 'app_log.txt'));
      await log('=== App Started ===');
    } catch (e) {
      debugPrint('Failed to init LogService: $e');
    }
  }

  Future<void> log(String message) async {
    final timestamp = DateTime.now().toIso8601String();
    final line = '[$timestamp] $message';
    // Print to console for dev
    debugPrint(line);

    // Write to file for release debugging
    if (_logFile != null) {
      try {
        await _logFile!.writeAsString('$line\n', mode: FileMode.append);
      } catch (_) {}
    }
  }

  static Future<void> info(String message) => instance.log('[INFO] $message');
  static Future<void> error(String message, [Object? e, StackTrace? s]) =>
      instance.log('[ERROR] $message ${e ?? ''} ${s ?? ''}');
}
