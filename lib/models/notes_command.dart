enum NotesCommandType {
  togglePin,
  toggleDone,
  toggleZOrder,
  deleteNote,
  updateText,
  updatePosition,
}

class NotesCommand {
  const NotesCommand({
    required this.type,
    required this.noteId,
    this.text,
    this.x,
    this.y,
  });

  final NotesCommandType type;
  final String noteId;
  final String? text;
  final double? x;
  final double? y;

  static const int currentVersion = 1;

  Map<String, Object?> toArgs() {
    return <String, Object?>{
      'v': currentVersion,
      'type': _typeToWire(type),
      'noteId': noteId,
      'text': text,
      'x': x,
      'y': y,
    };
  }

  static NotesCommand? tryFromArgs(Map<Object?, Object?> raw) {
    final v = raw['v'];
    if (v is! int || v != currentVersion) return null;

    final typeRaw = raw['type'];
    final noteId = raw['noteId'];
    if (typeRaw is! String || noteId is! String || noteId.trim().isEmpty) {
      return null;
    }

    final type = _typeFromWire(typeRaw);
    if (type == null) return null;

    final text = raw['text'];
    final x = raw['x'];
    final y = raw['y'];

    return NotesCommand(
      type: type,
      noteId: noteId,
      text: text is String ? text : null,
      x: x is num ? x.toDouble() : null,
      y: y is num ? y.toDouble() : null,
    );
  }

  static String _typeToWire(NotesCommandType type) => switch (type) {
    NotesCommandType.togglePin => 'toggle_pin',
    NotesCommandType.toggleDone => 'toggle_done',
    NotesCommandType.toggleZOrder => 'toggle_z_order',
    NotesCommandType.deleteNote => 'delete_note',
    NotesCommandType.updateText => 'update_text',
    NotesCommandType.updatePosition => 'update_position',
  };

  static NotesCommandType? _typeFromWire(String value) => switch (value) {
    'toggle_pin' => NotesCommandType.togglePin,
    'toggle_done' => NotesCommandType.toggleDone,
    'toggle_z_order' => NotesCommandType.toggleZOrder,
    'delete_note' => NotesCommandType.deleteNote,
    'update_text' => NotesCommandType.updateText,
    'update_position' => NotesCommandType.updatePosition,
    _ => null,
  };
}

