import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../../service/api/api_client.dart';
import '../model/owner_reports.dart';

class ReportsRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<OwnerReports> fetchReports(String centerId) async {
    final res = await _dio.get('/owner/centers/$centerId/reports');
    return OwnerReports.fromJson(res.data as Map<String, dynamic>);
  }
}
