import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../../../auth/controller/auth_controller.dart';
import '../model/staff_member.dart';
import '../repository/staff_repository.dart';

class StaffController extends GetxController {
  final _repo = StaffRepository();

  final RxList<StaffMember> staff = <StaffMember>[].obs;
  final RxBool loading = false.obs;
  final RxBool saving = false.obs;
  final RxString searchQuery = ''.obs;

  String get _centerId => Get.find<AuthController>().currentCenterId.value;

  List<StaffMember> get filtered {
    final q = searchQuery.value.toLowerCase();
    if (q.isEmpty) return staff;
    return staff.where((m) {
      return m.name.toLowerCase().contains(q) ||
          (m.specialization?.toLowerCase().contains(q) ?? false) ||
          (m.email?.toLowerCase().contains(q) ?? false);
    }).toList();
  }

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    loading.value = true;
    try {
      staff.value = await _repo.fetchStaff(_centerId);
    } catch (e) {
      debugPrint('[StaffController] $e');
    } finally {
      loading.value = false;
    }
  }

  Future<bool> createTeacher(Map<String, dynamic> payload) async {
    saving.value = true;
    try {
      final teacher = await _repo.createTeacher(_centerId, payload);
      staff.add(teacher);
      return true;
    } catch (e) {
      debugPrint('[StaffController] createTeacher: $e');
      Get.snackbar('Error', 'Could not add teacher.',
          snackPosition: SnackPosition.BOTTOM);
      return false;
    } finally {
      saving.value = false;
    }
  }

  Future<bool> updateTeacher(String teacherId, Map<String, dynamic> payload) async {
    saving.value = true;
    try {
      final updated = await _repo.updateTeacher(_centerId, teacherId, payload);
      final idx = staff.indexWhere((m) => m.id == teacherId);
      if (idx != -1) staff[idx] = updated;
      return true;
    } catch (e) {
      debugPrint('[StaffController] updateTeacher: $e');
      Get.snackbar('Error', 'Could not update teacher.',
          snackPosition: SnackPosition.BOTTOM);
      return false;
    } finally {
      saving.value = false;
    }
  }

  Future<bool> deleteTeacher(StaffMember member) async {
    saving.value = true;
    try {
      await _repo.deleteTeacher(_centerId, member.id);
      staff.removeWhere((m) => m.id == member.id);
      Get.snackbar('Removed', '${member.name} has been removed.',
          snackPosition: SnackPosition.BOTTOM);
      return true;
    } catch (e) {
      debugPrint('[StaffController] deleteTeacher: $e');
      Get.snackbar('Error', 'Could not remove teacher.',
          snackPosition: SnackPosition.BOTTOM);
      return false;
    } finally {
      saving.value = false;
    }
  }
}
