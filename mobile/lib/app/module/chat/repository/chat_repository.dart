import 'package:get/get.dart';

import '../../../service/api/api_client.dart';
import '../model/chat_model.dart';

class ChatRepository {
  final _dio = Get.find<ApiClient>().dio;

  Future<List<ChatConversation>> fetchConversations({required String role}) async {
    final res = await _dio.get(
      '/chat/conversations',
      queryParameters: {'role': role},
    );
    final list = res.data as List;
    return list
        .map((j) => ChatConversation.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<List<ChatMessage>> fetchMessages(String convId) async {
    final res = await _dio.get('/chat/conversations/$convId/messages');
    final list = res.data as List;
    return list
        .map((j) => ChatMessage.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<ChatMessage> sendMessage(
      String convId, String content, String senderId, String senderName) async {
    final res = await _dio.post(
      '/chat/conversations/$convId/messages',
      data: {
        'content': content,
        'sender_id': senderId,
        'sender_name': senderName,
        'type': 'text',
      },
    );
    return ChatMessage.fromJson(res.data as Map<String, dynamic>);
  }
}
