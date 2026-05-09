class CenterSummary {
  final String id;
  final String name;
  final String? address;
  final String? city;
  final String? phone;
  final String? logoUrl;
  final int studentCount;
  final int batchCount;
  final bool isActive;

  const CenterSummary({
    required this.id,
    required this.name,
    this.address,
    this.city,
    this.phone,
    this.logoUrl,
    this.studentCount = 0,
    this.batchCount = 0,
    this.isActive = true,
  });

  factory CenterSummary.fromJson(Map<String, dynamic> j) => CenterSummary(
        id: j['id'] as String,
        name: j['name'] as String,
        address: j['address'] as String?,
        city: j['city'] as String?,
        phone: j['phone'] as String?,
        logoUrl: j['logo_url'] as String?,
        studentCount: (j['student_count'] as int?) ?? 0,
        batchCount: (j['batch_count'] as int?) ?? 0,
        isActive: (j['is_active'] as bool?) ?? true,
      );
}
