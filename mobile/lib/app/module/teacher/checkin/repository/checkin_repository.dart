import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../../service/api/api_client.dart';
import '../model/checkin_model.dart';

class CheckInRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<List<CheckInRecord>> fetchHistory() async {
    final res = await _dio.get('/teacher/checkin/history');
    return (res.data as List<dynamic>)
        .map((e) => CheckInRecord.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<CheckInRecord> checkIn({
    required String centerId,
    required String centerName,
    double? latitude,
    double? longitude,
  }) async {
    final res = await _dio.post('/teacher/checkin', data: {
      'center_id': centerId,
      'center_name': centerName,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
    });
    return CheckInRecord.fromJson(res.data as Map<String, dynamic>);
  }
}
