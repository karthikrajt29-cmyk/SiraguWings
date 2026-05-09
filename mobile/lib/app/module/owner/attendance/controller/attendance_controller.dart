import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../../../auth/controller/auth_controller.dart';
import '../model/attendance_overview_row.dart';
import '../repository/attendance_repository.dart';

class AttendanceController extends GetxController {
  final _repo = AttendanceRepository();

  final RxList<AttendanceOverviewRow> rows = <AttendanceOverviewRow>[].obs;
  final RxBool loading = false.obs;
  final Rx<DateTime> selectedDate = DateTime.now().obs;

  List<AttendanceOverviewRow> get forSelectedDate {
    final d = _fmt(selectedDate.value);
    return rows.where((r) => r.date == d).toList();
  }

  List<String> get availableDates {
    final seen = <String>{};
    return rows.map((r) => r.date).where(seen.add).toList()..sort();
  }

  String _fmt(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    loading.value = true;
    try {
      final centerId = Get.find<AuthController>().currentCenterId.value;
      rows.value = await _repo.fetchOverview(centerId);
      // Default to latest date available.
      if (availableDates.isNotEmpty) {
        final parts = availableDates.last.split('-');
        selectedDate.value = DateTime(
          int.parse(parts[0]),
          int.parse(parts[1]),
          int.parse(parts[2]),
        );
      }
    } catch (e) {
      debugPrint('[AttendanceController] $e');
    } finally {
      loading.value = false;
    }
  }

  void setDate(DateTime d) => selectedDate.value = d;
}
