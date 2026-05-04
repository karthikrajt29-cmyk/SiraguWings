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
        isActive: (j['is_active'] as bool?) ?? true,
      );
}

class AttendanceStudent {
  final String studentId;
  final String name;
  final String? profileImageUrl;
  String? status; // null = not marked

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
