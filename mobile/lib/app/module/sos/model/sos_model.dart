class SosAlertItem {
  final String id;
  final String userName;
  final String? centerName;
  final double? latitude;
  final double? longitude;
  final String? message;
  final String status;
  final String sourceRole;
  final DateTime createdDate;

  const SosAlertItem({
    required this.id,
    required this.userName,
    this.centerName,
    this.latitude,
    this.longitude,
    this.message,
    required this.status,
    required this.sourceRole,
    required this.createdDate,
  });

  factory SosAlertItem.fromJson(Map<String, dynamic> j) => SosAlertItem(
        id: j['id'] as String,
        userName: j['user_name'] as String,
        centerName: j['center_name'] as String?,
        latitude: (j['latitude'] as num?)?.toDouble(),
        longitude: (j['longitude'] as num?)?.toDouble(),
        message: j['message'] as String?,
        status: j['status'] as String,
        sourceRole: j['source_role'] as String,
        createdDate: DateTime.parse(j['created_date'] as String),
      );
}
