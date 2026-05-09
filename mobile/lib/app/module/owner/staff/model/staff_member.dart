class StaffMember {
  final String id;
  final String name;
  final String? profileImageUrl;
  final String? email;
  final String? mobileNumber;
  final String? specialization;
  final String? qualification;
  final String centerId;
  final String? centerName;
  final int batchesCount;
  final int experienceYears;
  final String? joinedDate;
  final bool isActive;

  const StaffMember({
    required this.id,
    required this.name,
    this.profileImageUrl,
    this.email,
    this.mobileNumber,
    this.specialization,
    this.qualification,
    required this.centerId,
    this.centerName,
    this.batchesCount = 0,
    this.experienceYears = 0,
    this.joinedDate,
    this.isActive = true,
  });

  factory StaffMember.fromJson(Map<String, dynamic> j) => StaffMember(
        id: j['id'] as String,
        name: j['name'] as String,
        profileImageUrl: j['profile_image_url'] as String?,
        email: j['email'] as String?,
        mobileNumber: j['mobile_number'] as String?,
        specialization: j['specialization'] as String?,
        qualification: j['qualification'] as String?,
        centerId: j['center_id'] as String,
        centerName: j['center_name'] as String?,
        batchesCount: (j['batches_count'] as int?) ?? 0,
        experienceYears: (j['experience_years'] as int?) ?? 0,
        joinedDate: j['joined_date'] as String?,
        isActive: (j['is_active'] as bool?) ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'profile_image_url': profileImageUrl,
        'email': email,
        'mobile_number': mobileNumber,
        'specialization': specialization,
        'qualification': qualification,
        'center_id': centerId,
        'center_name': centerName,
        'batches_count': batchesCount,
        'experience_years': experienceYears,
        'joined_date': joinedDate,
        'is_active': isActive,
      };

  StaffMember copyWith({
    String? name,
    String? email,
    String? mobileNumber,
    String? specialization,
    String? qualification,
    int? experienceYears,
    String? joinedDate,
    bool? isActive,
  }) =>
      StaffMember(
        id: id,
        name: name ?? this.name,
        profileImageUrl: profileImageUrl,
        email: email ?? this.email,
        mobileNumber: mobileNumber ?? this.mobileNumber,
        specialization: specialization ?? this.specialization,
        qualification: qualification ?? this.qualification,
        centerId: centerId,
        centerName: centerName,
        batchesCount: batchesCount,
        experienceYears: experienceYears ?? this.experienceYears,
        joinedDate: joinedDate ?? this.joinedDate,
        isActive: isActive ?? this.isActive,
      );
}
