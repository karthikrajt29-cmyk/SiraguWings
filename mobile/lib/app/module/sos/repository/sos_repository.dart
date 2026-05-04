import 'package:dio/dio.dart';
import 'package:get/get.dart' hide Response;

import '../../../service/api/api_client.dart';
import '../model/sos_model.dart';

class SosRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<SosAlertItem> raiseAlert({
    String? centerId,
    double? latitude,
    double? longitude,
    double? accuracyMeters,
    String? message,
    required String sourceRole,
  }) async {
    final res = await _dio.post('/sos/alert', data: {
      if (centerId != null) 'center_id': centerId,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (accuracyMeters != null) 'accuracy_meters': accuracyMeters,
      if (message != null) 'message': message,
      'source_role': sourceRole,
    });
    return SosAlertItem.fromJson(res.data as Map<String, dynamic>);
  }

  Future<List<SosAlertItem>> listAlerts({bool onlyOpen = false}) async {
    final res = await _dio.get('/sos/alerts', queryParameters: {
      'only_open': onlyOpen,
    });
    return (res.data as List<dynamic>)
        .map((e) => SosAlertItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
