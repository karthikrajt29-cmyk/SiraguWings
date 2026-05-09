import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../../service/api/api_client.dart';
import '../../../owner/fees/model/fee_invoice.dart';

class ParentFeesRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<List<FeeInvoice>> fetchFees() async {
    final res = await _dio.get('/parent/fees');
    final list = res.data as List<dynamic>;
    return list
        .map((e) => FeeInvoice.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
