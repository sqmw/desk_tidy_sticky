import 'dart:ffi';
import 'package:ffi/ffi.dart';

/// Native Windows API constants and structs for window composition.
/// These are used to enable special window effects like blur and acrylic.
const WCA_ACCENT_POLICY = 19;

const ACCENT_DISABLED = 0;
const ACCENT_ENABLE_GRADIENT = 1;
const ACCENT_ENABLE_TRANSPARENTGRADIENT = 2;
const ACCENT_ENABLE_BLURBEHIND = 3;
const ACCENT_ENABLE_ACRYLICBLURBEHIND = 4;

final class ACCENT_POLICY extends Struct {
  @Int32()
  external int AccentState;
  @Int32()
  external int AccentFlags;
  @Int32()
  external int GradientColor;
  @Int32()
  external int AnimationId;
}

final class WINDOWCOMPOSITIONATTRIBDATA extends Struct {
  @Int32()
  external int Attribute;
  external Pointer<ACCENT_POLICY> Data;
  @Int32()
  external int SizeOfData;
}

typedef SetWindowCompositionAttributeNative =
    Int32 Function(IntPtr hwnd, Pointer<WINDOWCOMPOSITIONATTRIBDATA> data);
typedef SetWindowCompositionAttributeDart =
    int Function(int hwnd, Pointer<WINDOWCOMPOSITIONATTRIBDATA> data);

class WindowEffectService {
  static final _user32 = DynamicLibrary.open('user32.dll');
  static final _setWindowCompositionAttribute = _user32
      .lookupFunction<
        SetWindowCompositionAttributeNative,
        SetWindowCompositionAttributeDart
      >('SetWindowCompositionAttribute');

  /// Sets the window frosted glass (blur) effect.
  /// [hwnd] is the native window handle.
  /// [enabled] determines whether the effect is applied.
  static void setFrostedGlass(int hwnd, {bool enabled = true}) {
    if (hwnd == 0) return;

    final accent = calloc<ACCENT_POLICY>();
    try {
      if (enabled) {
        // We use ACCENT_ENABLE_BLURBEHIND (3) as it's more stable on older Win10
        // and doesn't require a specific background color to look good.
        // ACCENT_ENABLE_ACRYLICBLURBEHIND (4) is better for Win11/Modern Win10.
        accent.ref.AccentState = ACCENT_ENABLE_BLURBEHIND;
        accent.ref.AccentFlags = 2; // Draw all borders
        accent.ref.GradientColor = 0x00FFFFFF; // Transparent
      } else {
        accent.ref.AccentState = ACCENT_DISABLED;
      }

      final data = calloc<WINDOWCOMPOSITIONATTRIBDATA>();
      try {
        data.ref.Attribute = WCA_ACCENT_POLICY;
        data.ref.Data = accent;
        data.ref.SizeOfData = sizeOf<ACCENT_POLICY>();

        _setWindowCompositionAttribute(hwnd, data);
      } finally {
        calloc.free(data);
      }
    } finally {
      calloc.free(accent);
    }
  }

  /// Alternative: Sets the window Acrylic effect.
  /// Note: This might be laggy when moving the window on some Windows 10 versions.
  static void setAcrylic(int hwnd, {int color = 0x00FFFFFF}) {
    if (hwnd == 0) return;

    final accent = calloc<ACCENT_POLICY>();
    try {
      accent.ref.AccentState = ACCENT_ENABLE_ACRYLICBLURBEHIND;
      accent.ref.AccentFlags = 2;
      accent.ref.GradientColor = color;

      final data = calloc<WINDOWCOMPOSITIONATTRIBDATA>();
      try {
        data.ref.Attribute = WCA_ACCENT_POLICY;
        data.ref.Data = accent;
        data.ref.SizeOfData = sizeOf<ACCENT_POLICY>();

        _setWindowCompositionAttribute(hwnd, data);
      } finally {
        calloc.free(data);
      }
    } finally {
      calloc.free(accent);
    }
  }
}
