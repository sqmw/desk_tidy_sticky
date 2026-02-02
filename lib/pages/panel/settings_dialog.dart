import 'dart:io';
import 'package:flutter/material.dart';
import 'package:launch_at_startup/launch_at_startup.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../../l10n/strings.dart';
import '../../theme/app_theme.dart';
import '../../services/panel_preferences.dart';
import '../../services/github_service.dart';

class SettingsDialog extends StatefulWidget {
  final Strings strings;

  const SettingsDialog({super.key, required this.strings});

  @override
  State<SettingsDialog> createState() => _SettingsDialogState();
}

class _SettingsDialogState extends State<SettingsDialog> {
  bool _isAutoStart = false;
  bool _showPanelOnStartup = false;

  @override
  void initState() {
    super.initState();
    _initAutoStart();
    _initPanelStartupVisibility();
  }

  Future<void> _initAutoStart() async {
    // Basic setup for launch_at_startup
    // Note: On Windows, standard practice is to use the executable path.
    // launch_at_startup handles this via package_info_plus usually, but we need
    // to ensure package_info is ready or passed in.
    // Actually, launch_at_startup.setup needs to be called once in main or here.
    // We'll trust it works if we configure it correctly.

    // Usually setup should be done in main(), but we can do lazy init check here.
    // For simplicity, we just check status.
    // If not initialized in main, we might need to do it here.
    // Given the flow, let's assume valid setup or do a quick setup.

    PackageInfo packageInfo = await PackageInfo.fromPlatform();
    LaunchAtStartup.instance.setup(
      appName: packageInfo.appName,
      appPath: Platform.resolvedExecutable,
    );

    bool isEnabled = await LaunchAtStartup.instance.isEnabled();
    if (mounted) {
      setState(() {
        _isAutoStart = isEnabled;
      });
    }
  }

  Future<void> _toggleAutoStart(bool value) async {
    if (value) {
      await LaunchAtStartup.instance.enable();
    } else {
      await LaunchAtStartup.instance.disable();
    }
    setState(() {
      _isAutoStart = value;
    });
  }

  Future<void> _initPanelStartupVisibility() async {
    final show = await PanelPreferences.getShowPanelOnStartup();
    if (mounted) {
      setState(() {
        _showPanelOnStartup = show;
      });
    }
  }

  Future<void> _togglePanelStartupVisibility(bool value) async {
    await PanelPreferences.setShowPanelOnStartup(value);
    if (mounted) {
      setState(() {
        _showPanelOnStartup = value;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Re-setup instance just in case if app name is needed, but typically setup is one-off.
    // We'll rely on the initState setup.

    return AlertDialog(
      title: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(widget.strings.settingsTitle),
          FilledButton.icon(
            onPressed: () async {
              await GithubService.openRepo();
            },
            icon: const Icon(Icons.star, size: 16),
            label: Text(
              widget.strings.starOnGithub,
              style: const TextStyle(fontSize: 12),
            ),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF24292e), // GitHub Black
              foregroundColor: Colors.white,
              visualDensity: VisualDensity.compact,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
            ),
          ),
        ],
      ),
      content: SizedBox(
        width: 380,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    widget.strings.appName,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      widget.strings.version,
                      style: TextStyle(
                        fontSize: 10,
                        color: AppTheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              // Auto Start Toggle
              Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.strings.autoStart,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                  Switch(value: _isAutoStart, onChanged: _toggleAutoStart),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.strings.showPanelOnStartup,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                  Switch(
                    value: _showPanelOnStartup,
                    onChanged: _togglePanelStartupVisibility,
                  ),
                ],
              ),
              const Divider(height: 32),
              Text(
                widget.strings.shortcuts,
                style: Theme.of(context).textTheme.labelLarge,
              ),
              const SizedBox(height: 12),
              _buildShortcutItem(context, widget.strings.shortcutPinSave),
              _buildShortcutItem(context, widget.strings.shortcutToggle),
              _buildShortcutItem(context, widget.strings.shortcutOverlay),
              _buildShortcutItem(context, widget.strings.shortcutEsc),
            ],
          ), // Column
        ), // SingleChildScrollView
      ), // SizedBox
    ); // AlertDialog
  }

  Widget _buildShortcutItem(BuildContext context, String text) {
    final parts = text.split(':');
    final label = parts[0].trim();
    final keys = parts.length > 1 ? parts[1].trim() : '';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(label, style: Theme.of(context).textTheme.bodySmall),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: Colors.black12),
            ),
            child: Text(
              keys,
              style: const TextStyle(
                fontSize: 12,
                fontFamily: 'Consolas',
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
