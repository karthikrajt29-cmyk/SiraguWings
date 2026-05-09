import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../../auth/controller/auth_controller.dart';
import '../model/material_model.dart';
import '../repository/material_repository.dart';

class MaterialController extends GetxController {
  final _repo = MaterialRepository();

  final RxList<CourseMaterial> materials = <CourseMaterial>[].obs;
  final RxBool loading = false.obs;
  final RxBool uploading = false.obs;
  final RxString selectedType = 'All'.obs;

  String get _role => Get.find<AuthController>().currentRole.value;
  String get _userName => Get.find<AuthController>().profile.value?.name ?? '';

  List<CourseMaterial> get filtered {
    if (selectedType.value == 'All') return materials.toList();
    return materials
        .where((m) => m.type == selectedType.value.toLowerCase())
        .toList();
  }

  @override
  void onInit() {
    super.onInit();
    loadMaterials();
  }

  Future<void> loadMaterials() async {
    loading.value = true;
    try {
      materials.value = await _repo.fetchMaterials(role: _role);
    } catch (e) {
      debugPrint('[MaterialController] loadMaterials: $e');
    } finally {
      loading.value = false;
    }
  }

  Future<void> uploadMaterial({
    required String title,
    required String description,
    required String batchId,
    required String batchName,
    required String type,
  }) async {
    uploading.value = true;
    try {
      final mat = await _repo.createMaterial({
        'title': title,
        'description': description,
        'batch_id': batchId,
        'batch_name': batchName,
        'type': type,
        'file_name': '${title.toLowerCase().replaceAll(' ', '_')}.pdf',
        'uploaded_by': _userName,
      });
      materials.insert(0, mat);
      Get.snackbar('Uploaded', '"$title" shared with students.',
          snackPosition: SnackPosition.BOTTOM);
    } catch (e) {
      Get.snackbar('Error', 'Could not upload material.',
          snackPosition: SnackPosition.BOTTOM);
      debugPrint('[MaterialController] uploadMaterial: $e');
    } finally {
      uploading.value = false;
    }
  }

  Future<void> deleteMaterial(String id, String title) async {
    materials.removeWhere((m) => m.id == id);
    try {
      await _repo.deleteMaterial(id);
      Get.snackbar('Deleted', '"$title" removed.',
          snackPosition: SnackPosition.BOTTOM);
    } catch (e) {
      debugPrint('[MaterialController] deleteMaterial: $e');
      await loadMaterials();
    }
  }
}
