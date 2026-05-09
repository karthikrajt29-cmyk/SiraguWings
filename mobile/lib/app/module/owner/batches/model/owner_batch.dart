class OwnerBatch {
  final String id;
  final String name;
  final String centerId;
  final String? centerName;
  final String? courseName;
  final String? categoryType;
  final String? classDays;
  final String? startTime;
  final String? endTime;
  final int studentCount;
  final int? capacityCap;
  final double? monthlyFee;
  final String? teacherId;
  final String? teacherName;
  final bool isActive;

  const OwnerBatch({
    required this.id,
    required this.name,
    required this.centerId,
    this.centerName,
    this.courseName,
    this.categoryType,
    this.classDays,
    this.startTime,
    this.endTime,
    this.studentCount = 0,
    this.capacityCap,
    this.monthlyFee,
    this.teacherId,
    this.teacherName,
    this.isActive = true,
  });

  String? get timeDisplay =>
      (startTime != null && endTime != null) ? '$startTime – $endTime' : null;

  double get capacityPct =>
      (capacityCap != null && capacityCap! > 0)
          ? (studentCount / capacityCap!).clamp(0.0, 1.0)
          : 0;

  factory OwnerBatch.fromJson(Map<String, dynamic> j) => OwnerBatch(
        id: j['id'] as String,
        name: (j['batch_name'] ?? j['name']) as String,
        centerId: j['center_id'] as String,
        centerName: j['center_name'] as String?,
        courseName: j['course_name'] as String?,
        categoryType: j['category_type'] as String?,
        classDays: j['class_days'] as String?,
        startTime: j['start_time'] as String?,
        endTime: j['end_time'] as String?,
        studentCount: (j['student_count'] as int?) ?? 0,
        capacityCap: j['capacity_cap'] as int?,
        monthlyFee: (j['monthly_fee'] as num?)?.toDouble(),
        teacherId: j['teacher_id'] as String?,
        teacherName: j['teacher_name'] as String?,
        isActive: (j['is_active'] as bool?) ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'batch_name': name,
        'center_id': centerId,
        'center_name': centerName,
        'course_name': courseName,
        'category_type': categoryType,
        'class_days': classDays,
        'start_time': startTime,
        'end_time': endTime,
        'student_count': studentCount,
        'capacity_cap': capacityCap,
        'monthly_fee': monthlyFee,
        'teacher_id': teacherId,
        'teacher_name': teacherName,
        'is_active': isActive,
      };

  OwnerBatch copyWith({
    String? name,
    String? courseName,
    String? categoryType,
    String? classDays,
    String? startTime,
    String? endTime,
    int? capacityCap,
    double? monthlyFee,
    String? teacherId,
    String? teacherName,
    bool? isActive,
  }) =>
      OwnerBatch(
        id: id,
        name: name ?? this.name,
        centerId: centerId,
        centerName: centerName,
        courseName: courseName ?? this.courseName,
        categoryType: categoryType ?? this.categoryType,
        classDays: classDays ?? this.classDays,
        startTime: startTime ?? this.startTime,
        endTime: endTime ?? this.endTime,
        studentCount: studentCount,
        capacityCap: capacityCap ?? this.capacityCap,
        monthlyFee: monthlyFee ?? this.monthlyFee,
        teacherId: teacherId ?? this.teacherId,
        teacherName: teacherName ?? this.teacherName,
        isActive: isActive ?? this.isActive,
      );
}
