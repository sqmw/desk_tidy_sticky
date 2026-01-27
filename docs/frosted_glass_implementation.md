# Frosted Glass (Blur) Effect implementation

## Problem
The "frosted glass" effect was missing or only appeared intermittently. This was because the main panel had a solid white background, and no native blur effect was actually being requested from the Windows OS.

## Solution
We refined the approach to be consistent with the original `desk_tidy`, then further optimized for clarity:
1.  **Flutter Filter**: Used `BackdropFilter` with `ImageFilter.blur` in a custom `GlassContainer` widget.
2.  **Premium Glass Upgrade**:
    - **Noise Layer**: Added a grain texture to the glass surface to provide visual separation from the background.
    - **Luminosity Pass**: Added a `softLight` blend layer to prevent color washout on bright wallpapers.
3.  **Legibility Pass**: Added subtle `Shadow` effects to text titles, dates, and labels to ensure they remain "sharp" and readable.
4.  **Removed Native Overlays**: Removed `ACCENT_ENABLE_BLURBEHIND` as it introduced unwanted system-level tints.

## Implementation Details

### WindowEffectService
Located at `lib/services/window_effect_service.dart`. This service handles the low-level FFI calls to `user32.dll`.

### GlassContainer
Located at `lib/widgets/glass_container.dart`. A reusable widget that provides UI-level blur and semi-transparent tinting.

### UI Integration
- `main.dart`: Calls `WindowEffectService.setFrostedGlass(hwnd)` after window creation.
- `PanelPage`: Background set to `Colors.transparent`, body wrapped in `GlassContainer`.
- `PanelHeader`: backgrounds changed to `Colors.white.withValues(alpha: 0.05)` to let the blur show through.

## Key Principles
- **Transparency is key**: For blur to work, all parent containers (including the OS window itself) must be semi-transparent or transparent.
- **Fallbacks**: Combining native blur with Flutter blur provides the best visual consistency across different Windows environments.
