class OwnerStudent {
  final String id;
  final String name;
  final String? profileImageUrl;
  final String? dateOfBirth;
  final String? gender;
  final String? bloodGroup;
  final String? grade;
  final String? school;
  final String? medicalNotes;
  final String centerId;
  final String centerName;
  final String? batchId;
  final String? batchName;
  final String? parentId;
  final String? parentName;
  final String? parentMobile;
  final String? joinedDate;
  final String status;

  const OwnerStudent({
    required this.id,
    required this.name,
    this.profileImageUrl,
    this.dateOfBirth,
    this.gender,
    this.bloodGroup,
    this.grade,
    this.school,
    this.medicalNotes,
    required this.centerId,
    required this.centerName,
    this.batchId,
    this.batchName,
    this.parentId,
    this.parentName,
    this.parentMobile,
    this.joinedDate,
    required this.status,
  });

  factory OwnerStudent.fromJson(Map<String, dynamic> j) => OwnerStudent(
        id: j['id'] as String,
        name: j['name'] as String,
        profileImageUrl: j['profile_image_url'] as String?,
        dateOfBirth: j['date_of_birth'] as String?,
        gender: j['gender'] as String?,
        bloodGroup: j['blood_group'] as String?,
        grade: j['grade'] as String?,
        school: j['school'] as String?,
        medicalNotes: j['medical_notes'] as String?,
        centerId: j['center_id'] as String,
        centerName: j['center_name'] as String,
        batchId: j['batch_id'] as String?,
        batchName: j['batch_name'] as String?,
        parentId: j['parent_id'] as String?,
        parentName: j['parent_name'] as String?,
        parentMobile: j['parent_mobile'] as String?,
        joinedDate: j['joined_date'] as String?,
        status: j['status'] as String,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'profile_image_url': profileImageUrl,
        'date_of_birth': dateOfBirth,
        'gender': gender,
        'blood_group': bloodGroup,
        'grade': grade,
        'school': school,
        'medical_notes': medicalNotes,
        'center_id': centerId,
        'center_name': centerName,
        'batch_id': batchId,
        'batch_name': batchName,
        'parent_id': parentId,
        'parent_name': parentName,
        'parent_mobile': parentMobile,
        'joined_date': joinedDate,
        'status': status,
      };

  OwnerStudent copyWith({
    String? name,
    String? gender,
    String? dateOfBirth,
    String? bloodGroup,
    String? grade,
    String? school,
    String? medicalNotes,
    String? batchId,
    String? batchName,
    String? parentId,
    String? parentName,
    String? parentMobile,
    String? joinedDate,
    String? status,
  }) =>
      OwnerStudent(
        id: id,
        name: name ?? this.name,
        profileImageUrl: profileImageUrl,
        dateOfBirth: dateOfBirth ?? this.dateOfBirth,
        gender: gender ?? this.gender,
        bloodGroup: bloodGroup ?? this.bloodGroup,
        grade: grade ?? this.grade,
        school: school ?? this.school,
        medicalNotes: medicalNotes ?? this.medicalNotes,
        centerId: centerId,
        centerName: centerName,
        batchId: batchId ?? this.batchId,
        batchName: batchName ?? this.batchName,
        parentId: parentId ?? this.parentId,
        parentName: parentName ?? this.parentName,
        parentMobile: parentMobile ?? this.parentMobile,
        joinedDate: joinedDate ?? this.joinedDate,
        status: status ?? this.status,
      );
}
