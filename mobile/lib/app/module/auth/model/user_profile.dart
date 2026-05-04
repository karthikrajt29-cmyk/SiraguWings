class RoleEntry {
  final String role;
  final String? centerId;
  final String? centerName;
  final bool isActive;

  const RoleEntry({
    required this.role,
    this.centerId,
    this.centerName,
    this.isActive = true,
  });

  factory RoleEntry.fromJson(Map<String, dynamic> j) => RoleEntry(
        role: j['role'] as String,
        centerId: j['center_id'] as String?,
        centerName: j['center_name'] as String?,
        isActive: (j['is_active'] as bool?) ?? true,
      );
}

class UserProfile {
  final String userId;
  final String name;
  final String? email;
  final String? mobileNumber;
  final String? profileImageUrl;
  final List<RoleEntry> roles;

  const UserProfile({
    required this.userId,
    required this.name,
    this.email,
    this.mobileNumber,
    this.profileImageUrl,
    required this.roles,
  });

  factory UserProfile.fromJson(Map<String, dynamic> j) => UserProfile(
        userId: j['user_id'] as String,
        name: j['name'] as String,
        email: j['email'] as String?,
        mobileNumber: j['mobile_number'] as String?,
        profileImageUrl: j['profile_image_url'] as String?,
        roles: (j['roles'] as List<dynamic>)
            .map((r) => RoleEntry.fromJson(r as Map<String, dynamic>))
            .toList(),
      );

  List<String> get distinctRoles =>
      roles.map((r) => r.role).toSet().toList();

  bool hasRole(String role) => roles.any((r) => r.role == role);
}
