import 'package:uuid/uuid.dart';

class Note {
  final String id;
  String text;
  final DateTime createdAt;
  DateTime updatedAt;
  bool isPinned;
  bool isArchived;
  bool isDone;

  // Optional: Positioning for desktop notes
  double? x;
  double? y;
  double? width;
  double? height;

  Note({
    String? id,
    required this.text,
    DateTime? createdAt,
    DateTime? updatedAt,
    this.isPinned = false,
    this.isArchived = false,
    this.isDone = false,
    this.x,
    this.y,
    this.width,
    this.height,
  }) : id = id ?? const Uuid().v4(),
       createdAt = createdAt ?? DateTime.now(),
       updatedAt = updatedAt ?? DateTime.now();

  Note copyWith({
    String? text,
    bool? isPinned,
    bool? isArchived,
    bool? isDone,
    double? x,
    double? y,
    double? width,
    double? height,
  }) {
    return Note(
      id: id,
      text: text ?? this.text,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
      isPinned: isPinned ?? this.isPinned,
      isArchived: isArchived ?? this.isArchived,
      isDone: isDone ?? this.isDone,
      x: x ?? this.x,
      y: y ?? this.y,
      width: width ?? this.width,
      height: height ?? this.height,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'isPinned': isPinned,
      'isArchived': isArchived,
      'isDone': isDone,
      'x': x,
      'y': y,
      'width': width,
      'height': height,
    };
  }

  factory Note.fromJson(Map<String, dynamic> json) {
    return Note(
      id: json['id'],
      text: json['text'] ?? '',
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      isPinned: json['isPinned'] ?? false,
      isArchived: json['isArchived'] ?? false,
      isDone: json['isDone'] ?? false,
      x: json['x'],
      y: json['y'],
      width: json['width'],
      height: json['height'],
    );
  }
}
