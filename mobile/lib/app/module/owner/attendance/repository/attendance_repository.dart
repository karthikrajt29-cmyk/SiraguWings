import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../../service/api/api_client.dart';
import '../model/attendance_overview_row.dart';

class AttendanceRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<List<AttendanceOverviewRow>> fetchOverview(String centerId) async {
    final res =
        await _dio.get('/owner/centers/$centerId/attendance/overview');
    final list = res.data as List<dynamic>;
    return list
        .map((e) =>
            AttendanceOverviewRow.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
