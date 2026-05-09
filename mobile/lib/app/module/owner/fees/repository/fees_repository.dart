import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../../service/api/api_client.dart';
import '../model/fee_invoice.dart';

class OwnerFeesRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<List<FeeInvoice>> fetchFees(String centerId) async {
    final res = await _dio.get(
      '/owner/centers/$centerId/fees',
      queryParameters: {'page': 1, 'size': 200},
    );
    final data = res.data as Map<String, dynamic>;
    final items = data['items'] as List<dynamic>;
    return items
        .map((e) => FeeInvoice.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<FeeInvoice> createFee(
      String centerId, Map<String, dynamic> payload) async {
    final res = await _dio.post(
      '/owner/centers/$centerId/fees',
      data: payload,
    );
    return FeeInvoice.fromJson(res.data as Map<String, dynamic>);
  }

  Future<FeeInvoice> updateFee(
      String centerId, String feeId, Map<String, dynamic> payload) async {
    final res = await _dio.put(
      '/owner/centers/$centerId/fees/$feeId',
      data: payload,
    );
    return FeeInvoice.fromJson(res.data as Map<String, dynamic>);
  }

  Future<List<FeeInvoice>> bulkBillBatch(
      String centerId, Map<String, dynamic> payload) async {
    final res = await _dio.post(
      '/owner/centers/$centerId/fees/bulk',
      data: payload,
    );
    final list = res.data as List<dynamic>;
    return list
        .map((e) => FeeInvoice.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> sendReminder(String centerId, String feeId) async {
    await _dio.post('/owner/centers/$centerId/fees/$feeId/reminder');
  }
}
