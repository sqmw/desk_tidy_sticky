class MonitorRect {
  final int monitorId;
  final int left;
  final int top;
  final int width;
  final int height;

  const MonitorRect({
    required this.monitorId,
    required this.left,
    required this.top,
    required this.width,
    required this.height,
  });

  String toArg() => '$left,$top,$width,$height';

  static MonitorRect fromArg(String arg, {required int monitorId}) {
    final parts = arg.split(',');
    if (parts.length != 4) {
      throw FormatException('Invalid monitor rect arg: $arg');
    }
    return MonitorRect(
      monitorId: monitorId,
      left: int.parse(parts[0]),
      top: int.parse(parts[1]),
      width: int.parse(parts[2]),
      height: int.parse(parts[3]),
    );
  }
}

