import 'package:flutter/material.dart';

import '../../l10n/strings.dart';

class OverlayToolbar extends StatelessWidget {
  final bool clickThrough;
  final VoidCallback onClose;
  final ValueChanged<bool> onToggleClickThrough;
  final VoidCallback onRefresh;
  final Strings strings;

  const OverlayToolbar({
    super.key,
    required this.clickThrough,
    required this.onClose,
    required this.onToggleClickThrough,
    required this.onRefresh,
    required this.strings,
  });

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(10),
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
            tooltip: strings.overlayRefresh,
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh, color: Colors.white, size: 16),
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
