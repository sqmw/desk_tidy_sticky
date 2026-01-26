import 'package:flutter/material.dart';

class OverlayToolbar extends StatelessWidget {
  final bool clickThrough;
  final VoidCallback onClose;
  final ValueChanged<bool> onToggleClickThrough;
  final VoidCallback onRefresh;

  const OverlayToolbar({
    super.key,
    required this.clickThrough,
    required this.onClose,
    required this.onToggleClickThrough,
    required this.onRefresh,
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
                ? 'Disable click-through'
                : 'Enable click-through',
            onPressed: () => onToggleClickThrough(!clickThrough),
            icon: Icon(
              clickThrough ? Icons.visibility : Icons.visibility_off,
              color: Colors.white,
              size: 16,
            ),
          ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh, color: Colors.white, size: 16),
          ),
          IconButton(
            tooltip: 'Close overlay',
            onPressed: onClose,
            icon: const Icon(Icons.close, color: Colors.white, size: 16),
          ),
        ],
      ),
    );
  }
}
