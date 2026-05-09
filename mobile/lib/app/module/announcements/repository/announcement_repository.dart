import 'package:get/get.dart';

import '../../../service/api/api_client.dart';
import '../model/announcement_model.dart';

class AnnouncementRepository {
  final _dio = Get.find<ApiClient>().dio;

  Future<List<Announcement>> fetchAnnouncements() async {
    final res = await _dio.get('/announcements');
    final list = res.data as List;
    return list
        .map((j) => Announcement.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<Announcement> sendAnnouncement({
    required String title,
    required String body,
    required String targetBatch,
    required String senderName,
  }) async {
    final res = await _dio.post('/announcements', data: {
      'title': title,
      'body': body,
      'target_batch': targetBatch,
      'target_role': 'Parent',
      'sender_name': senderName,
    });
    return Announcement.fromJson(res.data as Map<String, dynamic>);
  }
}
