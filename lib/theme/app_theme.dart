import 'package:flutter/material.dart';

/// Centralized colors/spacing to align desk_tidy_sticky with desk_tidy family.
class AppTheme {
  static const Color primary = Color(0xFF3A6FF7); // desk_tidy uses blue
  static const Color accent = Color(0xFFF6C344); // warm accent for notes
  static const Color neutral = Color(0xFF303133);
  static const Color surface = Color(0xFFF5F7FA);
  static const Color card = Color(0xFFFFFFFF);
  static const Color divider = Color(0xFFE4E7ED);
  static const Color overlayBar = Color(0xCC1F2A44); // semi-transparent navy

  static const BorderRadius cardRadius = BorderRadius.all(Radius.circular(12));
  static const BorderRadius pillRadius = BorderRadius.all(Radius.circular(18));

  static ThemeData buildTheme() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.light,
      surface: surface,
    );
    return ThemeData(
      colorScheme: colorScheme,
      useMaterial3: true,
      fontFamily: 'Segoe UI',
      fontFamilyFallback: const ['Microsoft YaHei'],
      scaffoldBackgroundColor: surface,
      dividerColor: divider,
      cardTheme: const CardThemeData(
        color: card,
        elevation: 2,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: cardRadius),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        border: InputBorder.none,
        isDense: true,
      ),
      iconTheme: const IconThemeData(color: neutral, size: 18),
      textTheme: const TextTheme(
        titleMedium: TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 15,
          color: neutral,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          color: Colors.black87,
        ),
        labelLarge: TextStyle(
          fontWeight: FontWeight.w600,
          letterSpacing: 0.1,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          shape: const StadiumBorder(),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        ),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          shape: WidgetStateProperty.all(const StadiumBorder()),
          padding: WidgetStateProperty.all(
            const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
        ),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.all(Colors.white),
        trackColor: WidgetStateProperty.resolveWith((states) {
          return states.contains(WidgetState.selected)
              ? primary.withValues(alpha: 0.9)
              : divider;
        }),
      ),
    );
  }
}
