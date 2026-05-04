class OwnerDashboardStats {
  final int totalStudents;
  final int totalBatches;
  final int pendingFees;
  final double overdueAmount;

  const OwnerDashboardStats({
    required this.totalStudents,
    required this.totalBatches,
    required this.pendingFees,
    required this.overdueAmount,
  });

  factory OwnerDashboardStats.fromJson(Map<String, dynamic> j) =>
      OwnerDashboardStats(
        totalStudents: (j['total_students'] as int?) ?? 0,
        totalBatches: (j['total_batches'] as int?) ?? 0,
        pendingFees: (j['pending_fees'] as int?) ?? 0,
        overdueAmount: ((j['overdue_amount'] as num?) ?? 0).toDouble(),
      );
}
