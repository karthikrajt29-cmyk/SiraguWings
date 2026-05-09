class TeacherBatch {
  final String id;
  final String centerId;
  final String centerName;
  final String courseName;
  final String batchName;
  final String? categoryType;
  final String classDays;
  final String startTime;
  final String endTime;
  final int studentCount;
  final int attendanceThisWeek;
  final bool isActive;

  const TeacherBatch({
    required this.id,
    required this.centerId,
    required this.centerName,
    required this.courseName,
    required this.batchName,
    this.categoryType,
    required this.classDays,
    required this.startTime,
    required this.endTime,
    required this.studentCount,
    this.attendanceThisWeek = 0,
    required this.isActive,
  });

  factory TeacherBatch.fromJson(Map<String, dynamic> j) => TeacherBatch(
        id: j['id'] as String,
        centerId: j['center_id'] as String,
        centerName: j['center_name'] as String,
        courseName: j['course_name'] as String,
        batchName: j['batch_name'] as String,
        categoryType: j['category_type'] as String?,
        classDays: j['class_days'] as String,
        startTime: j['start_time'] as String,
        endTime: j['end_time'] as String,
        studentCount: (j['student_count'] as int?) ?? 0,
        attendanceThisWeek: (j['attendance_this_week'] as int?) ?? 0,
        isActive: (j['is_active'] as bool?) ?? true,
      );
}

class AttendanceStudent {
  final String studentId;
  final String name;
  final String? profileImageUrl;
  String? status;

  AttendanceStudent({
    required this.studentId,
    required this.name,
    this.profileImageUrl,
    this.status,
  });

  factory AttendanceStudent.fromJson(Map<String, dynamic> j) =>
      AttendanceStudent(
        studentId: j['student_id'] as String,
        name: j['name'] as String,
        profileImageUrl: j['profile_image_url'] as String?,
        status: j['status'] as String?,
      );
}

class TeacherStats {
  final int totalStudents;
  final int totalBatches;
  final int todayClasses;
  final int attendanceThisWeekPct;
  final int classesThisMonth;

  const TeacherStats({
    required this.totalStudents,
    required this.totalBatches,
    required this.todayClasses,
    required this.attendanceThisWeekPct,
    required this.classesThisMonth,
  });

  factory TeacherStats.fromJson(Map<String, dynamic> j) => TeacherStats(
        totalStudents: (j['total_students'] as int?) ?? 0,
        totalBatches: (j['total_batches'] as int?) ?? 0,
        todayClasses: (j['today_classes'] as int?) ?? 0,
        attendanceThisWeekPct: (j['attendance_this_week_pct'] as int?) ?? 0,
        classesThisMonth: (j['classes_this_month'] as int?) ?? 0,
      );
}
