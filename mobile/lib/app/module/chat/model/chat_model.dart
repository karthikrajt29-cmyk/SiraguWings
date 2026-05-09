class ChatConversation {
  final String id;
  final String participantId;
  final String participantName;
  final String participantRole;
  final String? participantAvatar;
  final String lastMessage;
  final DateTime lastMessageAt;
  final int unreadCount;
  final String? childName;

  const ChatConversation({
    required this.id,
    required this.participantId,
    required this.participantName,
    required this.participantRole,
    this.participantAvatar,
    required this.lastMessage,
    required this.lastMessageAt,
    required this.unreadCount,
    this.childName,
  });

  factory ChatConversation.fromJson(Map<String, dynamic> j) => ChatConversation(
        id: j['id'] as String,
        participantId: j['participant_id'] as String,
        participantName: j['participant_name'] as String,
        participantRole: j['participant_role'] as String,
        participantAvatar: j['participant_avatar'] as String?,
        lastMessage: j['last_message'] as String,
        lastMessageAt: DateTime.parse(j['last_message_at'] as String),
        unreadCount: (j['unread_count'] as int?) ?? 0,
        childName: j['child_name'] as String?,
      );
}

class ChatMessage {
  final String id;
  final String senderId;
  final String senderName;
  final String content;
  final DateTime sentAt;
  final bool isRead;
  final String type;
  final String? fileName;

  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.content,
    required this.sentAt,
    required this.isRead,
    this.type = 'text',
    this.fileName,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
        id: j['id'] as String,
        senderId: j['sender_id'] as String,
        senderName: j['sender_name'] as String,
        content: j['content'] as String,
        sentAt: DateTime.parse(j['sent_at'] as String),
        isRead: (j['is_read'] as bool?) ?? true,
        type: (j['type'] as String?) ?? 'text',
        fileName: j['file_name'] as String?,
      );
}
