class NearbyCenter {
  final String id;
  final String name;
  final String address;
  final String phone;
  final double rating;
  final int reviewCount;
  final double distanceKm;
  final String openTime;
  final String closeTime;
  final List<String> courses;
  final String? photoUrl;
  final bool isEnrolled;

  const NearbyCenter({
    required this.id,
    required this.name,
    required this.address,
    required this.phone,
    required this.rating,
    required this.reviewCount,
    required this.distanceKm,
    required this.openTime,
    required this.closeTime,
    required this.courses,
    this.photoUrl,
    required this.isEnrolled,
  });

  factory NearbyCenter.fromJson(Map<String, dynamic> j) => NearbyCenter(
        id: j['id'] as String,
        name: j['name'] as String,
        address: j['address'] as String,
        phone: j['phone'] as String,
        rating: (j['rating'] as num).toDouble(),
        reviewCount: j['review_count'] as int,
        distanceKm: (j['distance_km'] as num).toDouble(),
        openTime: j['open_time'] as String,
        closeTime: j['close_time'] as String,
        courses: List<String>.from(j['courses'] as List),
        photoUrl: j['photo_url'] as String?,
        isEnrolled: j['is_enrolled'] as bool,
      );
}

class ParentUpdate {
  final String id;
  final String type;
  final String title;
  final String subtitle;
  final String? dueDate;
  final String priority;
  final String? batch;

  const ParentUpdate({
    required this.id,
    required this.type,
    required this.title,
    required this.subtitle,
    this.dueDate,
    required this.priority,
    this.batch,
  });

  factory ParentUpdate.fromJson(Map<String, dynamic> j) => ParentUpdate(
        id: j['id'] as String,
        type: j['type'] as String,
        title: j['title'] as String,
        subtitle: j['subtitle'] as String,
        dueDate: j['due_date'] as String?,
        priority: j['priority'] as String,
        batch: j['batch'] as String?,
      );
}
