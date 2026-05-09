import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../model/teacher_batch_model.dart';
import '../repository/teacher_batch_repository.dart';

class TeacherBatchController extends GetxController {
  final _repo = TeacherBatchRepository();

  final RxList<TeacherBatch> batches = <TeacherBatch>[].obs;
  final Rx<TeacherStats?> stats = Rx(null);
  final RxBool loading = false.obs;

  // Attendance state for the selected batch.
  final Rx<TeacherBatch?> selectedBatch = Rx(null);
  final RxList<AttendanceStudent> students = <AttendanceStudent>[].obs;
  final RxBool attendanceLoading = false.obs;
  final RxBool saving = false.obs;
  late String attendanceDate;

  // Geo state
  final Rx<Position?> capturedPosition = Rx(null);
  final RxBool geoLoading = false.obs;

  // ── Derived counts ──────────────────────────────────────────────────
  int get presentCount =>
      students.where((s) => s.status == 'Present').length;
  int get absentCount =>
      students.where((s) => s.status == 'Absent').length;
  int get unmarkedCount =>
      students.where((s) => s.status == null).length;

  @override
  void onInit() {
    super.onInit();
    loadAll();
  }

  Future<void> loadAll() async {
    loading.value = true;
    try {
      final results = await Future.wait([
        _repo.fetchBatches(),
        _repo.fetchStats(),
      ]);
      batches.value = results[0] as List<TeacherBatch>;
      stats.value = results[1] as TeacherStats;
    } catch (e) {
      debugPrint('[TeacherBatchController] loadAll: $e');
    } finally {
      loading.value = false;
    }
  }

  Future<void> loadBatches() async {
    loading.value = true;
    try {
      batches.value = await _repo.fetchBatches();
    } catch (e) {
      debugPrint('[TeacherBatchController] loadBatches: $e');
    } finally {
      loading.value = false;
    }
  }

  Future<void> openAttendance(TeacherBatch batch, {String? date}) async {
    selectedBatch.value = batch;
    attendanceDate = date ?? DateFormat('yyyy-MM-dd').format(DateTime.now());
    capturedPosition.value = null;
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
    s.status = switch (s.status) {
      'Present' => 'Absent',
      'Absent' => null,
      _ => 'Present',
    };
    students.refresh();
  }

  void setAll(String status) {
    for (final s in students) {
      s.status = status;
    }
    students.refresh();
  }

  // ── Geo capture ─────────────────────────────────────────────────────

  Future<void> captureLocation() async {
    geoLoading.value = true;
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        Get.snackbar('Location denied',
            'Grant location permission to tag attendance location.',
            snackPosition: SnackPosition.BOTTOM);
        return;
      }
      capturedPosition.value = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
        ),
      );
    } catch (e) {
      debugPrint('[TeacherBatchController] geo: $e');
    } finally {
      geoLoading.value = false;
    }
  }

  // ── Save ────────────────────────────────────────────────────────────

  Future<void> saveAttendance() async {
    final marks = students
        .where((s) => s.status != null)
        .map((s) => {'student_id': s.studentId, 'status': s.status})
        .toList();
    if (marks.isEmpty) {
      Get.snackbar('Nothing to save', 'Mark at least one student.',
          snackPosition: SnackPosition.BOTTOM);
      return;
    }

    // Capture location if not already done.
    if (capturedPosition.value == null) {
      await captureLocation();
    }

    saving.value = true;
    try {
      final pos = capturedPosition.value;
      await _repo.saveAttendance(
        selectedBatch.value!.id,
        attendanceDate,
        marks,
        latitude: pos?.latitude,
        longitude: pos?.longitude,
      );

      final locationNote = pos != null
          ? '\nLocation: ${pos.latitude.toStringAsFixed(4)}, ${pos.longitude.toStringAsFixed(4)}'
          : '';
      Get.snackbar(
        'Saved',
        'Attendance for ${marks.length} student(s) recorded.$locationNote',
        snackPosition: SnackPosition.BOTTOM,
        duration: const Duration(seconds: 4),
      );
      Get.back();
    } catch (e) {
      Get.snackbar('Error', 'Could not save attendance.',
          snackPosition: SnackPosition.BOTTOM);
      debugPrint('[TeacherBatchController] saveAttendance: $e');
    } finally {
      saving.value = false;
    }
  }
}
