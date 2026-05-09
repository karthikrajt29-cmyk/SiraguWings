class Announcement {
  final String id;
  final String title;
  final String body;
  final String targetRole;
  final String targetBatch;
  final DateTime createdAt;
  final int sentTo;
  final String senderName;

  const Announcement({
    required this.id,
    required this.title,
    required this.body,
    required this.targetRole,
    required this.targetBatch,
    required this.createdAt,
    required this.sentTo,
    required this.senderName,
  });

  factory Announcement.fromJson(Map<String, dynamic> j) => Announcement(
        id: j['id'] as String,
        title: j['title'] as String,
        body: j['body'] as String,
        targetRole: j['target_role'] as String,
        targetBatch: j['target_batch'] as String,
        createdAt: DateTime.parse(j['created_at'] as String),
        sentTo: (j['sent_to'] as int?) ?? 0,
        senderName: j['sender_name'] as String,
      );
}
