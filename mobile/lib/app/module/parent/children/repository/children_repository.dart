import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../../service/api/api_client.dart';
import '../model/child_model.dart';

class ChildrenRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<List<ChildSummary>> fetchChildren() async {
    final res = await _dio.get('/parent/children');
    return (res.data as List<dynamic>)
        .map((e) => ChildSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<AttendanceDay>> fetchAttendance(
    String childId, {
    String? start,
    String? end,
  }) async {
    final res = await _dio.get(
      '/parent/children/$childId/attendance',
      queryParameters: {
        if (start != null) 'start': start,
        if (end != null) 'end': end,
      },
    );
    return (res.data as List<dynamic>)
        .map((e) => AttendanceDay.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
