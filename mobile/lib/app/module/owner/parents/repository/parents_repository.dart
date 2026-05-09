import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../../service/api/api_client.dart';
import '../model/parent_summary.dart';

class ParentsRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<List<ParentSummary>> fetchParents(String centerId) async {
    final res = await _dio.get('/owner/centers/$centerId/parents');
    final list = res.data as List<dynamic>;
    return list
        .map((e) => ParentSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
