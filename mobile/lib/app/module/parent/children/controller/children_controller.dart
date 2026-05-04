import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../model/child_model.dart';
import '../repository/children_repository.dart';

class ChildrenController extends GetxController {
  final _repo = ChildrenRepository();

  final RxList<ChildSummary> children = <ChildSummary>[].obs;
  final RxBool loading = false.obs;

  final Rx<ChildSummary?> selectedChild = Rx(null);
  final RxList<AttendanceDay> attendance = <AttendanceDay>[].obs;
  final RxBool attendanceLoading = false.obs;

  @override
  void onInit() {
    super.onInit();
    loadChildren();
  }

  Future<void> loadChildren() async {
    loading.value = true;
    try {
      children.value = await _repo.fetchChildren();
    } catch (e) {
      debugPrint('[ChildrenController] $e');
    } finally {
      loading.value = false;
    }
  }

  Future<void> openChild(ChildSummary child) async {
    selectedChild.value = child;
    attendanceLoading.value = true;
    try {
      attendance.value = await _repo.fetchAttendance(child.id);
    } catch (e) {
      debugPrint('[ChildrenController] fetchAttendance: $e');
    } finally {
      attendanceLoading.value = false;
    }
  }
}
