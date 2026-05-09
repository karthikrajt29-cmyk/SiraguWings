import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../../service/api/api_client.dart';
import '../model/owner_student.dart';

class StudentsRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<List<OwnerStudent>> fetchStudents(String centerId,
      {String? query}) async {
    final res = await _dio.get(
      '/owner/centers/$centerId/students',
      queryParameters: {
        if (query != null && query.isNotEmpty) 'q': query,
        'page': 1,
        'size': 100,
      },
    );
    final data = res.data as Map<String, dynamic>;
    final items = data['items'] as List<dynamic>;
    return items
        .map((e) => OwnerStudent.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<OwnerStudent> createStudent(
      String centerId, Map<String, dynamic> payload) async {
    final res = await _dio.post(
      '/owner/centers/$centerId/students',
      data: payload,
    );
    return OwnerStudent.fromJson(res.data as Map<String, dynamic>);
  }

  Future<OwnerStudent> updateStudent(
      String centerId, String studentId, Map<String, dynamic> payload) async {
    final res = await _dio.put(
      '/owner/centers/$centerId/students/$studentId',
      data: payload,
    );
    return OwnerStudent.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> deleteStudent(String centerId, String studentId) async {
    await _dio.delete('/owner/centers/$centerId/students/$studentId');
  }
}
