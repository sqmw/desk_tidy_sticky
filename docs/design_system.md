# Design System

## Iconography

### Header Icons
Icons in the header panel generally follow a stateful logic:
- **Active State**: Use **Filled** Material Design icons to indicate the feature is enabled.
- **Inactive State**: Use **Fully Hollow / Wireframe** icons (stroke-based) to indicate the feature is disabled.

#### Desktop Sticker Icon
- **Active**: `desktop_windows` (Filled).
- **Inactive**: `desktop_windows` (Outlined/Wireframe).
  - *Note*: The standard Material "Outlined" path often has filled shapes (like the stand). For this project, we use a custom constructed **wireframe** SVG (strokes only) to ensure it looks fully hollow and lightweight when inactive.
