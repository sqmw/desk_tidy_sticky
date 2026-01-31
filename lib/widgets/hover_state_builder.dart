import 'package:flutter/widgets.dart';

class HoverStateBuilder extends StatefulWidget {
  const HoverStateBuilder({
    super.key,
    required this.builder,
    this.enabled = true,
  });

  final bool enabled;
  final Widget Function(BuildContext context, bool hovering) builder;

  @override
  State<HoverStateBuilder> createState() => _HoverStateBuilderState();
}

class _HoverStateBuilderState extends State<HoverStateBuilder> {
  bool _hovering = false;

  @override
  void didUpdateWidget(covariant HoverStateBuilder oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.enabled && _hovering) {
      _hovering = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.enabled;
    return MouseRegion(
      onEnter: enabled
          ? (_) {
              if (_hovering) return;
              setState(() => _hovering = true);
            }
          : null,
      onExit: enabled
          ? (_) {
              if (!_hovering) return;
              setState(() => _hovering = false);
            }
          : null,
      child: widget.builder(context, enabled && _hovering),
    );
  }
}
