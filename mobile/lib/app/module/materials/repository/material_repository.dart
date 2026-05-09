import 'package:get/get.dart';

import '../../../service/api/api_client.dart';
import '../model/material_model.dart';

class MaterialRepository {
  final _dio = Get.find<ApiClient>().dio;

  Future<List<CourseMaterial>> fetchMaterials({String? role}) async {
    final res = await _dio.get(
      '/materials',
      queryParameters: role != null ? {'role': role} : null,
    );
    final list = res.data as List;
    return list
        .map((j) => CourseMaterial.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<CourseMaterial> createMaterial(Map<String, dynamic> data) async {
    final res = await _dio.post('/materials', data: data);
    return CourseMaterial.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> deleteMaterial(String id) async {
    await _dio.delete('/materials/$id');
  }
}
