import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../../service/api/api_client.dart';
import '../model/center_summary.dart';

class CentersRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<List<CenterSummary>> fetchCenters() async {
    final res = await _dio.get('/owner/centers');
    final list = res.data as List<dynamic>;
    return list
        .map((e) => CenterSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
