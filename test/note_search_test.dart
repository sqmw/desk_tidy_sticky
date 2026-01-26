import 'package:flutter_test/flutter_test.dart';

import 'package:desk_tidy_sticky/utils/note_search.dart';

void main() {
  group('NoteSearchMatcher', () {
    test('matches latin query', () {
      final index = NoteSearchIndex.fromText('Fix build pipeline');
      expect(NoteSearchMatcher.match('build', index).matched, isTrue);
      expect(NoteSearchMatcher.match('PIPE', index).matched, isTrue);
      expect(NoteSearchMatcher.match('nope', index).matched, isFalse);
    });

    test('matches pinyin initials', () {
      // "桌面整理" -> zhengli: initials should include "zmzl"
      final index = NoteSearchIndex.fromText('桌面整理');
      expect(NoteSearchMatcher.match('zm', index).matched, isTrue);
    });
  });
}
