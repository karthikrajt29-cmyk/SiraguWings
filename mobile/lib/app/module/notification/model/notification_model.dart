class NotificationItem {
  final String id;
  final String? centerName;
  final String type;
  final String category;
  final String title;
  final String body;
  final DateTime? readAt;
  final DateTime createdDate;

  const NotificationItem({
    required this.id,
    this.centerName,
    required this.type,
    required this.category,
    required this.title,
    required this.body,
    this.readAt,
    required this.createdDate,
  });

  bool get isRead => readAt != null;

  factory NotificationItem.fromJson(Map<String, dynamic> j) => NotificationItem(
        id: j['id'] as String,
        centerName: j['center_name'] as String?,
        type: j['type'] as String,
        category: j['category'] as String,
        title: j['title'] as String,
        body: j['body'] as String,
        readAt: j['read_at'] != null
            ? DateTime.parse(j['read_at'] as String)
            : null,
        createdDate: DateTime.parse(j['created_date'] as String),
      );
}
