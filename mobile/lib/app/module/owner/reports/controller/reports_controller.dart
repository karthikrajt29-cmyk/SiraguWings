import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../../../auth/controller/auth_controller.dart';
import '../model/owner_reports.dart';
import '../repository/reports_repository.dart';

enum ReportPeriod { month, threeMonths, sixMonths, year }

extension ReportPeriodLabel on ReportPeriod {
  String get label {
    switch (this) {
      case ReportPeriod.month:
        return '1 Month';
      case ReportPeriod.threeMonths:
        return '3 Months';
      case ReportPeriod.sixMonths:
        return '6 Months';
      case ReportPeriod.year:
        return '1 Year';
    }
  }

  int get monthsBack {
    switch (this) {
      case ReportPeriod.month:
        return 1;
      case ReportPeriod.threeMonths:
        return 3;
      case ReportPeriod.sixMonths:
        return 6;
      case ReportPeriod.year:
        return 12;
    }
  }
}

class ReportsController extends GetxController {
  final _repo = ReportsRepository();

  final Rx<OwnerReports?> reports = Rx(null);
  final RxBool loading = false.obs;
  final Rx<ReportPeriod> period = ReportPeriod.sixMonths.obs;

  // ── Derived data ────────────────────────────────────────────────────────────

  List<RevenuePoint> get filteredRevenue {
    final all = reports.value?.revenueByMonth ?? const [];
    final n = period.value.monthsBack.clamp(1, all.length);
    return all.length <= n ? all : all.sublist(all.length - n);
  }

  List<RevenuePoint> get filteredEnrolment {
    final all = reports.value?.enrolmentTrend ?? const [];
    final n = period.value.monthsBack.clamp(1, all.length);
    return all.length <= n ? all : all.sublist(all.length - n);
  }

  /// Month-over-month percentage change in revenue (current vs previous in window).
  double get revenueMoMChange {
    final r = filteredRevenue;
    if (r.length < 2) return 0;
    final last = r.last.amount;
    final prev = r[r.length - 2].amount;
    if (prev == 0) return 0;
    return ((last - prev) / prev) * 100;
  }

  /// Top 5 batches by attendance (desc).
  List<BatchAttendance> get topBatches {
    final all = reports.value?.attendanceByBatch ?? const [];
    final sorted = [...all]
      ..sort((a, b) => b.attendancePct.compareTo(a.attendancePct));
    return sorted.take(5).toList();
  }

  /// Bottom 3 batches by attendance (lowest first).
  List<BatchAttendance> get attentionNeeded {
    final all = reports.value?.attendanceByBatch ?? const [];
    final sorted = [...all]
      ..sort((a, b) => a.attendancePct.compareTo(b.attendancePct));
    return sorted.where((b) => b.attendancePct < 80).take(3).toList();
  }

  /// Total revenue across the filtered window.
  double get totalRevenueInPeriod =>
      filteredRevenue.fold(0, (s, p) => s + p.amount);

  /// Average attendance across all batches.
  double get averageAttendance {
    final all = reports.value?.attendanceByBatch ?? const [];
    if (all.isEmpty) return 0;
    return all.fold<double>(0, (s, b) => s + b.attendancePct) / all.length;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    loading.value = true;
    try {
      final centerId = Get.find<AuthController>().currentCenterId.value;
      reports.value = await _repo.fetchReports(centerId);
    } catch (e) {
      debugPrint('[ReportsController] $e');
    } finally {
      loading.value = false;
    }
  }

  void setPeriod(ReportPeriod p) => period.value = p;
}
