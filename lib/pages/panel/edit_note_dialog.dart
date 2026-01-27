import 'package:flutter/material.dart';
import '../../l10n/strings.dart';

Future<String?> showEditNoteDialog(
  BuildContext context, {
  required String title,
  required String initialText,
  required Strings strings,
}) {
  final controller = TextEditingController(text: initialText);
  return showDialog<String>(
    context: context,
    builder: (context) {
      return AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          autofocus: true,
          minLines: 1,
          maxLines: 10,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(strings.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text.trim()),
            child: Text(strings.saveNote),
          ),
        ],
      );
    },
  );
}
