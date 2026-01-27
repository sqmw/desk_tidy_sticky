import 'package:flutter/material.dart';

import '../../l10n/strings.dart';
import '../../theme/app_theme.dart';

class OverlayToolbar extends StatelessWidget {
  final bool clickThrough;
  final VoidCallback onClose;
  final ValueChanged<bool> onToggleClickThrough;
  final Strings strings;

  const OverlayToolbar({
    super.key,
    required this.clickThrough,
    required this.onClose,
    required this.onToggleClickThrough,
    required this.strings,
  });

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppTheme.overlayBar,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          IconButton(
            tooltip: clickThrough
                ? '${strings.overlayClickThrough} (${strings.overlayTip})'
                : strings.overlayClickThrough,
            onPressed: () => onToggleClickThrough(!clickThrough),
            icon: Icon(
              clickThrough ? Icons.visibility : Icons.visibility_off,
              color: Colors.white,
              size: 16,
            ),
          ),
          IconButton(
            tooltip: strings.overlayClose,
            onPressed: onClose,
            icon: const Icon(Icons.close, color: Colors.white, size: 16),
          ),
        ],
      ),
    );
  }
}
