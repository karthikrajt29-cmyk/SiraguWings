class ParentSummary {
  final String id;
  final String name;
  final String? mobileNumber;
  final String? email;
  final int kidsCount;
  final String centerId;

  const ParentSummary({
    required this.id,
    required this.name,
    this.mobileNumber,
    this.email,
    this.kidsCount = 0,
    required this.centerId,
  });

  factory ParentSummary.fromJson(Map<String, dynamic> j) => ParentSummary(
        id: j['id'] as String,
        name: j['name'] as String,
        mobileNumber: j['mobile_number'] as String?,
        email: j['email'] as String?,
        kidsCount: (j['kids_count'] as int?) ?? 0,
        centerId: j['center_id'] as String,
      );
}
