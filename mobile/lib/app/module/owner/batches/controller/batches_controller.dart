import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../../../auth/controller/auth_controller.dart';
import '../../staff/model/staff_member.dart';
import '../../staff/repository/staff_repository.dart';
import '../model/owner_batch.dart';
import '../repository/batches_repository.dart';

class BatchesController extends GetxController {
  final _repo = BatchesRepository();
  final _staffRepo = StaffRepository();

  final RxList<OwnerBatch> batches = <OwnerBatch>[].obs;
  final RxList<StaffMember> teachers = <StaffMember>[].obs;
  final RxBool loading = false.obs;
  final RxBool saving = false.obs;

  String get _centerId => Get.find<AuthController>().currentCenterId.value;

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    loading.value = true;
    try {
      final centerId = _centerId;
      final results = await Future.wait([
        _repo.fetchBatches(centerId),
        _staffRepo.fetchStaff(centerId),
      ]);
      batches.value = results[0] as List<OwnerBatch>;
      teachers.value = results[1] as List<StaffMember>;
    } catch (e) {
      debugPrint('[BatchesController] $e');
    } finally {
      loading.value = false;
    }
  }

  Future<bool> createBatch(Map<String, dynamic> payload) async {
    saving.value = true;
    try {
      final batch = await _repo.createBatch(_centerId, payload);
      batches.add(batch);
      return true;
    } catch (e) {
      debugPrint('[BatchesController] createBatch: $e');
      Get.snackbar('Error', 'Could not create batch.',
          snackPosition: SnackPosition.BOTTOM);
      return false;
    } finally {
      saving.value = false;
    }
  }

  Future<bool> updateBatch(String batchId, Map<String, dynamic> payload) async {
    saving.value = true;
    try {
      final updated = await _repo.updateBatch(_centerId, batchId, payload);
      final idx = batches.indexWhere((b) => b.id == batchId);
      if (idx != -1) batches[idx] = updated;
      return true;
    } catch (e) {
      debugPrint('[BatchesController] updateBatch: $e');
      Get.snackbar('Error', 'Could not update batch.',
          snackPosition: SnackPosition.BOTTOM);
      return false;
    } finally {
      saving.value = false;
    }
  }

  Future<bool> deleteBatch(OwnerBatch batch) async {
    saving.value = true;
    try {
      await _repo.deleteBatch(_centerId, batch.id);
      batches.removeWhere((b) => b.id == batch.id);
      Get.snackbar('Deleted', '${batch.name} has been deleted.',
          snackPosition: SnackPosition.BOTTOM);
      return true;
    } catch (e) {
      debugPrint('[BatchesController] deleteBatch: $e');
      Get.snackbar('Error', 'Could not delete batch.',
          snackPosition: SnackPosition.BOTTOM);
      return false;
    } finally {
      saving.value = false;
    }
  }
}
