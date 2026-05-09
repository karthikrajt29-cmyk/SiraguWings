import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../../service/api/api_client.dart';
import '../model/owner_batch.dart';

class BatchesRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<List<OwnerBatch>> fetchBatches(String centerId) async {
    final res = await _dio.get('/owner/centers/$centerId/batches');
    final list = res.data as List<dynamic>;
    return list
        .map((e) => OwnerBatch.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<OwnerBatch> createBatch(
      String centerId, Map<String, dynamic> payload) async {
    final res = await _dio.post(
      '/owner/centers/$centerId/batches',
      data: payload,
    );
    return OwnerBatch.fromJson(res.data as Map<String, dynamic>);
  }

  Future<OwnerBatch> updateBatch(
      String centerId, String batchId, Map<String, dynamic> payload) async {
    final res = await _dio.put(
      '/owner/centers/$centerId/batches/$batchId',
      data: payload,
    );
    return OwnerBatch.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> deleteBatch(String centerId, String batchId) async {
    await _dio.delete('/owner/centers/$centerId/batches/$batchId');
  }
}
