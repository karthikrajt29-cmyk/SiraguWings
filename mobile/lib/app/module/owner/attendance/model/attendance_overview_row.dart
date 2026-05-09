class AttendanceOverviewRow {
  final String date;
  final String batchId;
  final String batchName;
  final String centerId;
  final int presentCount;
  final int absentCount;
  final int totalStudents;

  const AttendanceOverviewRow({
    required this.date,
    required this.batchId,
    required this.batchName,
    required this.centerId,
    required this.presentCount,
    required this.absentCount,
    required this.totalStudents,
  });

  double get presentPct =>
      totalStudents == 0 ? 0 : presentCount / totalStudents * 100;

  factory AttendanceOverviewRow.fromJson(Map<String, dynamic> j) =>
      AttendanceOverviewRow(
        date: j['date'] as String,
        batchId: j['batch_id'] as String,
        batchName: j['batch_name'] as String,
        centerId: j['center_id'] as String,
        presentCount: (j['present_count'] as int?) ?? 0,
        absentCount: (j['absent_count'] as int?) ?? 0,
        totalStudents: (j['total_students'] as int?) ?? 0,
      );
}
