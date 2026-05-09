import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../../service/api/api_client.dart';
import '../model/staff_member.dart';

class StaffRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<List<StaffMember>> fetchStaff(String centerId) async {
    final res = await _dio.get('/owner/centers/$centerId/teachers');
    final list = res.data as List<dynamic>;
    return list
        .map((e) => StaffMember.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<StaffMember> createTeacher(
      String centerId, Map<String, dynamic> payload) async {
    final res = await _dio.post(
      '/owner/centers/$centerId/teachers',
      data: payload,
    );
    return StaffMember.fromJson(res.data as Map<String, dynamic>);
  }

  Future<StaffMember> updateTeacher(
      String centerId, String teacherId, Map<String, dynamic> payload) async {
    final res = await _dio.put(
      '/owner/centers/$centerId/teachers/$teacherId',
      data: payload,
    );
    return StaffMember.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> deleteTeacher(String centerId, String teacherId) async {
    await _dio.delete('/owner/centers/$centerId/teachers/$teacherId');
  }
}
