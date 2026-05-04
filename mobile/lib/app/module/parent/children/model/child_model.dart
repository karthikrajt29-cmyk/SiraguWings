class ChildSummary {
  final String id;
  final String name;
  final String? profileImageUrl;
  final String? dateOfBirth;
  final String? gender;
  final List<ChildCenter> centers;

  const ChildSummary({
    required this.id,
    required this.name,
    this.profileImageUrl,
    this.dateOfBirth,
    this.gender,
    required this.centers,
  });

  factory ChildSummary.fromJson(Map<String, dynamic> j) => ChildSummary(
        id: j['id'] as String,
        name: j['name'] as String,
        profileImageUrl: j['profile_image_url'] as String?,
        dateOfBirth: j['date_of_birth'] as String?,
        gender: j['gender'] as String?,
        centers: (j['centers'] as List<dynamic>)
            .map((e) => ChildCenter.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class ChildCenter {
  final String centerId;
  final String centerName;
  final String status;

  const ChildCenter({
    required this.centerId,
    required this.centerName,
    required this.status,
  });

  factory ChildCenter.fromJson(Map<String, dynamic> j) => ChildCenter(
        centerId: j['center_id'] as String,
        centerName: j['center_name'] as String,
        status: j['status'] as String,
      );
}

class AttendanceDay {
  final String attendanceDate;
  final String batchName;
  final String? courseName;
  final String status;

  const AttendanceDay({
    required this.attendanceDate,
    required this.batchName,
    this.courseName,
    required this.status,
  });

  factory AttendanceDay.fromJson(Map<String, dynamic> j) => AttendanceDay(
        attendanceDate: j['attendance_date'] as String,
        batchName: j['batch_name'] as String,
        courseName: j['course_name'] as String?,
        status: j['status'] as String,
      );
}
