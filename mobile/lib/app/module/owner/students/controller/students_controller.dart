import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../../../auth/controller/auth_controller.dart';
import '../../parents/model/parent_summary.dart';
import '../../parents/repository/parents_repository.dart';
import '../../batches/model/owner_batch.dart';
import '../../batches/repository/batches_repository.dart';
import '../model/owner_student.dart';
import '../repository/students_repository.dart';

class StudentsController extends GetxController {
  final _repo = StudentsRepository();
  final _parentsRepo = ParentsRepository();
  final _batchesRepo = BatchesRepository();

  final RxList<OwnerStudent> students = <OwnerStudent>[].obs;
  final RxList<ParentSummary> parents = <ParentSummary>[].obs;
  final RxList<OwnerBatch> batches = <OwnerBatch>[].obs;
  final RxBool loading = false.obs;
  final RxBool saving = false.obs;
  final RxString searchQuery = ''.obs;
  final RxString genderFilter = 'All'.obs;

  String get _centerId => Get.find<AuthController>().currentCenterId.value;

  List<OwnerStudent> get filtered {
    var list = students.toList();
    if (genderFilter.value != 'All') {
      list = list.where((s) => s.gender == genderFilter.value).toList();
    }
    final q = searchQuery.value.toLowerCase();
    if (q.isEmpty) return list;
    return list.where((s) {
      return s.name.toLowerCase().contains(q) ||
          (s.batchName?.toLowerCase().contains(q) ?? false) ||
          (s.parentName?.toLowerCase().contains(q) ?? false);
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
      final centerId = _centerId;
      final results = await Future.wait([
        _repo.fetchStudents(centerId),
        _parentsRepo.fetchParents(centerId),
        _batchesRepo.fetchBatches(centerId),
      ]);
      students.value = results[0] as List<OwnerStudent>;
      parents.value = results[1] as List<ParentSummary>;
      batches.value = results[2] as List<OwnerBatch>;
    } catch (e) {
      debugPrint('[StudentsController] $e');
    } finally {
      loading.value = false;
    }
  }

  Future<bool> createStudent(Map<String, dynamic> payload) async {
    saving.value = true;
    try {
      final student = await _repo.createStudent(_centerId, payload);
      students.insert(0, student);
      return true;
    } catch (e) {
      debugPrint('[StudentsController] createStudent: $e');
      Get.snackbar('Error', 'Could not add student. Please try again.',
          snackPosition: SnackPosition.BOTTOM);
      return false;
    } finally {
      saving.value = false;
    }
  }

  Future<bool> updateStudent(String studentId, Map<String, dynamic> payload) async {
    saving.value = true;
    try {
      final updated = await _repo.updateStudent(_centerId, studentId, payload);
      final idx = students.indexWhere((s) => s.id == studentId);
      if (idx != -1) students[idx] = updated;
      return true;
    } catch (e) {
      debugPrint('[StudentsController] updateStudent: $e');
      Get.snackbar('Error', 'Could not update student.',
          snackPosition: SnackPosition.BOTTOM);
      return false;
    } finally {
      saving.value = false;
    }
  }

  Future<bool> deleteStudent(OwnerStudent student) async {
    saving.value = true;
    try {
      await _repo.deleteStudent(_centerId, student.id);
      students.removeWhere((s) => s.id == student.id);
      Get.snackbar('Removed', '${student.name} has been removed.',
          snackPosition: SnackPosition.BOTTOM);
      return true;
    } catch (e) {
      debugPrint('[StudentsController] deleteStudent: $e');
      Get.snackbar('Error', 'Could not remove student.',
          snackPosition: SnackPosition.BOTTOM);
      return false;
    } finally {
      saving.value = false;
    }
  }
}
