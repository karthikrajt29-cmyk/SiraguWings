class OwnerReports {
  final ReportSummary summary;
  final List<RevenuePoint> revenueByMonth;
  final List<BatchAttendance> attendanceByBatch;
  final List<RevenuePoint> enrolmentTrend;

  const OwnerReports({
    required this.summary,
    required this.revenueByMonth,
    required this.attendanceByBatch,
    required this.enrolmentTrend,
  });

  factory OwnerReports.fromJson(Map<String, dynamic> j) => OwnerReports(
        summary: ReportSummary.fromJson(j['summary'] as Map<String, dynamic>),
        revenueByMonth: (j['revenue_by_month'] as List<dynamic>)
            .map((e) => RevenuePoint.fromJson(e as Map<String, dynamic>))
            .toList(),
        attendanceByBatch: (j['attendance_by_batch'] as List<dynamic>)
            .map((e) => BatchAttendance.fromJson(e as Map<String, dynamic>))
            .toList(),
        enrolmentTrend: (j['enrolment_trend'] as List<dynamic>)
            .map((e) => RevenuePoint.fromJson(
                  {'month': e['month'], 'amount': e['count']},
                ))
            .toList(),
      );
}

class ReportSummary {
  final double totalRevenueThisMonth;
  final double totalRevenueLastMonth;
  final double outstandingDues;
  final int activeStudents;
  final double averageAttendancePct;

  const ReportSummary({
    required this.totalRevenueThisMonth,
    required this.totalRevenueLastMonth,
    required this.outstandingDues,
    required this.activeStudents,
    required this.averageAttendancePct,
  });

  factory ReportSummary.fromJson(Map<String, dynamic> j) => ReportSummary(
        totalRevenueThisMonth:
            ((j['total_revenue_this_month'] as num?) ?? 0).toDouble(),
        totalRevenueLastMonth:
            ((j['total_revenue_last_month'] as num?) ?? 0).toDouble(),
        outstandingDues: ((j['outstanding_dues'] as num?) ?? 0).toDouble(),
        activeStudents: (j['active_students'] as int?) ?? 0,
        averageAttendancePct:
            ((j['average_attendance_pct'] as num?) ?? 0).toDouble(),
      );
}

class RevenuePoint {
  final String month;
  final double amount;

  const RevenuePoint({required this.month, required this.amount});

  factory RevenuePoint.fromJson(Map<String, dynamic> j) => RevenuePoint(
        month: j['month'] as String,
        amount: ((j['amount'] as num?) ?? 0).toDouble(),
      );
}

class BatchAttendance {
  final String batchId;
  final String batchName;
  final double attendancePct;

  const BatchAttendance({
    required this.batchId,
    required this.batchName,
    required this.attendancePct,
  });

  factory BatchAttendance.fromJson(Map<String, dynamic> j) => BatchAttendance(
        batchId: j['batch_id'] as String,
        batchName: j['batch_name'] as String,
        attendancePct: ((j['attendance_pct'] as num?) ?? 0).toDouble(),
      );
}
