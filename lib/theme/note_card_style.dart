import 'package:flutter/material.dart';
import 'app_theme.dart';

class NoteCardStyle {
  static BoxDecoration decoration() {
    return BoxDecoration(
      color: AppTheme.accent.withValues(alpha: 0.18),
      borderRadius: AppTheme.cardRadius,
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.06),
          blurRadius: 6,
          offset: const Offset(0, 3),
        ),
      ],
    );
  }

  static TextStyle textStyle(bool isDone) {
    return TextStyle(
      color: AppTheme.neutral.withValues(alpha: isDone ? 0.45 : 0.9),
      fontWeight: FontWeight.w600,
      decoration: isDone ? TextDecoration.lineThrough : TextDecoration.none,
      height: 1.4,
      fontSize: 14,
    );
  }
}
