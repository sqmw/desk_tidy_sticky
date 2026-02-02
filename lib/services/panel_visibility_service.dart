import 'package:flutter/widgets.dart';

import 'log_service.dart';
import 'panel_window_service.dart';

class PanelVisibilityService {
  PanelVisibilityService._();

  static Future<void> applyStartupVisibility({
    required bool showOnStartup,
  }) async {
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (showOnStartup) {
        await PanelWindowService.show(focus: false);
        await LogService.info('Panel Window Shown (Startup Preference)');
        return;
      }
      await PanelWindowService.ensureHidden();
      await LogService.info('Panel Window Hidden (Startup Preference)');
    });
  }
}
