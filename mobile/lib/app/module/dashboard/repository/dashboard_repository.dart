import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../service/api/api_client.dart';
import '../model/owner_dashboard_model.dart';

class DashboardRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<OwnerDashboardStats> fetchOwnerStats(String centerId) async {
    final res = await _dio.get('/owner/dashboard', queryParameters: {
      'center_id': centerId,
    });
    return OwnerDashboardStats.fromJson(res.data as Map<String, dynamic>);
  }
}
