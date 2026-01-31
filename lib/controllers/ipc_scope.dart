class IpcScope {
  IpcScope._();

  static const panel = 'panel';

  static String note(String noteId) => 'note:$noteId';

  static String overlay(String layer) => 'overlay:$layer';
}

