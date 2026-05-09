class CheckInRecord {
  final String id;
  final String date;
  final String centerId;
  final String centerName;
  final String? checkInTime;
  final double? latitude;
  final double? longitude;
  final String status;

  const CheckInRecord({
    required this.id,
    required this.date,
    required this.centerId,
    required this.centerName,
    this.checkInTime,
    this.latitude,
    this.longitude,
    required this.status,
  });

  bool get isPresent => status == 'Present';

  factory CheckInRecord.fromJson(Map<String, dynamic> j) => CheckInRecord(
        id: j['id'] as String,
        date: j['date'] as String,
        centerId: j['center_id'] as String,
        centerName: j['center_name'] as String,
        checkInTime: j['check_in_time'] as String?,
        latitude: (j['latitude'] as num?)?.toDouble(),
        longitude: (j['longitude'] as num?)?.toDouble(),
        status: j['status'] as String,
      );
}
