import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../../service/api/api_client.dart';
import '../model/teacher_batch_model.dart';

class TeacherBatchRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<TeacherStats> fetchStats() async {
    final res = await _dio.get('/teacher/stats');
    return TeacherStats.fromJson(res.data as Map<String, dynamic>);
  }

  Future<List<TeacherBatch>> fetchBatches() async {
    final res = await _dio.get('/teacher/batches');
    return (res.data as List<dynamic>)
        .map((e) => TeacherBatch.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<AttendanceStudent>> fetchAttendance(
      String batchId, String date) async {
    final res = await _dio.get(
      '/teacher/batches/$batchId/attendance',
      queryParameters: {'date': date},
    );
    final data = res.data as Map<String, dynamic>;
    return (data['items'] as List<dynamic>)
        .map((e) => AttendanceStudent.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> saveAttendance(
    String batchId,
    String date,
    List<Map<String, dynamic>> marks, {
    double? latitude,
    double? longitude,
  }) async {
    await _dio.post('/teacher/batches/$batchId/attendance', data: {
      'attendance_date': date,
      'marks': marks,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
    });
  }
}
