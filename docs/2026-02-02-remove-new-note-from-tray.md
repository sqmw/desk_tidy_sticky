# Removing "New Sticky Note" from Tray Menu

## Context
The user requested to remove the "New Sticky Note" (新建便笺) option from the system tray right-click menu.

## Changes
- **File**: `lib/services/tray_service.dart`
- **Action**: Removed the `MenuItemLabel` corresponding to `strings.trayNewNote`.

## Reason
To simplify the tray menu and remove unwanted functionality as per user request.

## Verification
- Checked the code to ensure the `MenuItemLabel` is removed from the `menu.buildFrom` list.
- The "New Sticky Note" option should no longer appear when right-clicking the tray icon.
