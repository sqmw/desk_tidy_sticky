import 'package:lpinyin/lpinyin.dart';

/// Small, purpose-built search helper for notes.
///
/// Supports:
/// - Case-insensitive latin/number search
/// - Chinese pinyin full/initials search (via lpinyin)
/// - Simple scoring for sorting results
class NoteSearchIndex {
  final String sourceText;
  final String normalizedText;
  final String normalizedPinyin;
  final String normalizedInitials;

  NoteSearchIndex._({
    required this.sourceText,
    required this.normalizedText,
    required this.normalizedPinyin,
    required this.normalizedInitials,
  });

  factory NoteSearchIndex.fromText(String text) {
    final normalized = _normalize(text);
    return NoteSearchIndex._(
      sourceText: text,
      normalizedText: normalized,
      normalizedPinyin: _normalize(_safePinyin(text)),
      normalizedInitials: _normalize(_safeInitials(text)),
    );
  }
}

class NoteSearchMatch {
  final bool matched;
  final int score;

  const NoteSearchMatch._(this.matched, this.score);

  static const none = NoteSearchMatch._(false, 0);
  static const passthrough = NoteSearchMatch._(true, 100);
}

class NoteSearchMatcher {
  NoteSearchMatcher._();

  static NoteSearchMatch match(String query, NoteSearchIndex index) {
    final q = _normalize(query);
    if (q.isEmpty) return NoteSearchMatch.passthrough;

    final text = index.normalizedText;
    if (text == q) return const NoteSearchMatch._(true, 100);
    if (text.startsWith(q)) return const NoteSearchMatch._(true, 90);
    if (text.contains(q)) return const NoteSearchMatch._(true, 75);

    final pinyin = index.normalizedPinyin;
    if (pinyin.startsWith(q)) return const NoteSearchMatch._(true, 65);
    if (pinyin.contains(q)) return const NoteSearchMatch._(true, 55);

    final initials = index.normalizedInitials;
    if (initials.startsWith(q)) return const NoteSearchMatch._(true, 50);
    if (_isSubsequence(q, initials)) return const NoteSearchMatch._(true, 40);

    return NoteSearchMatch.none;
  }
}

final RegExp _split = RegExp(r'[^a-z0-9\u4e00-\u9fff]+', caseSensitive: false);

String _normalize(String input) => input.toLowerCase().replaceAll(_split, '');

String _safePinyin(String input) {
  if (input.trim().isEmpty) return '';
  try {
    return PinyinHelper.getPinyinE(input);
  } catch (_) {
    return '';
  }
}

String _safeInitials(String input) {
  if (input.trim().isEmpty) return '';
  try {
    return PinyinHelper.getShortPinyin(input);
  } catch (_) {
    return '';
  }
}

bool _isSubsequence(String needle, String haystack) {
  if (needle.isEmpty) return true;
  var i = 0;
  for (var j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] == needle[i]) i++;
  }
  return i == needle.length;
}
