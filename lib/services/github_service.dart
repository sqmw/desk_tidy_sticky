import 'package:url_launcher/url_launcher.dart';

class GithubService {
  GithubService._();

  static final Uri repoUri = Uri.parse('https://github.com/sqmw/desk_tidy_sticky');

  static Future<bool> openRepo() async {
    if (!await canLaunchUrl(repoUri)) return false;
    return launchUrl(repoUri, mode: LaunchMode.externalApplication);
  }
}

