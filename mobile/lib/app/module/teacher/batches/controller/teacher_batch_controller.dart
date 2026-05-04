import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../model/teacher_batch_model.dart';
import '../repository/teacher_batch_repository.dart';

class TeacherBatchController extends GetxController {
  final _repo = TeacherBatchRepository();

  final RxList<TeacherBatch> batches = <TeacherBatch>[].obs;
  final RxBool loading = false.obs;

  // Attendance state for the selected batch.
  final Rx<TeacherBatch?> selectedBatch = Rx(null);
  final RxList<AttendanceStudent> students = <AttendanceStudent>[].obs;
  final RxBool attendanceLoading = false.obs;
  final RxBool saving = false.obs;
  late String attendanceDate;

  @override
  void onInit() {
    super.onInit();
    loadBatches();
  }

  Future<void> loadBatches() async {
    loading.value = true;
    try {
      batches.value = await _repo.fetchBatches();
    } catch (e) {
      debugPrint('[TeacherBatchController] $e');
    } finally {
      loading.value = false;
    }
  }

  Future<void> openAttendance(TeacherBatch batch, {String? date}) async {
    selectedBatch.value = batch;
    attendanceDate = date ?? DateFormat('yyyy-MM-dd').format(DateTime.now());
    attendanceLoading.value = true;
    try {
      students.value = await _repo.fetchAttendance(batch.id, attendanceDate);
    } catch (e) {
      debugPrint('[TeacherBatchController] fetchAttendance: $e');
    } finally {
      attendanceLoading.value = false;
    }
  }

  void toggleStatus(int index) {
    final s = students[index];
    s.status = (s.status == 'Present') ? 'Absent' : 'Present';
    students.refresh();
  }

  void setAll(String status) {
    for (final s in students) {
      s.status = status;
    }
    students.refresh();
  }

  Future<void> saveAttendance() async {
    final marks = students
        .where((s) => s.status != null)
        .map((s) => {'student_id': s.studentId, 'status': s.status})
        .toList();
    if (marks.isEmpty) {
      Get.snackbar('Nothing to save', 'Mark at least one student.');
      return;
    }
    saving.value = true;
    try {
      await _repo.saveAttendance(selectedBatch.value!.id, attendanceDate, marks);
      Get.snackbar('Saved', 'Attendance recorded for ${marks.length} student(s).');
      Get.back();
    } catch (e) {
      Get.snackbar('Error', 'Could not save attendance.');
      debugPrint('[TeacherBatchController] saveAttendance: $e');
    } finally {
      saving.value = false;
    }
  }
}
