import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../service/api/api_client.dart';
import '../../auth/controller/auth_controller.dart';
import '../model/notification_model.dart';

class NotificationRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  String get _basePath {
    final role = Get.find<AuthController>().currentRole.value;
    switch (role) {
      case 'Owner': return '/owner/notifications';
      case 'Parent': return '/parent/notifications';
      case 'Teacher': return '/teacher/notifications';
      default: return '/owner/notifications';
    }
  }

  Future<List<NotificationItem>> fetchNotifications({
    int page = 1,
    int size = 50,
  }) async {
    final res = await _dio.get(_basePath, queryParameters: {
      'page': page,
      'size': size,
    });
    return (res.data as List<dynamic>)
        .map((e) => NotificationItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> markRead(String id) async {
    await _dio.patch('$_basePath/$id/read');
  }

  Future<void> markAllRead() async {
    await _dio.post('$_basePath/read-all');
  }
}
