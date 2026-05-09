import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../../auth/controller/auth_controller.dart';
import '../model/chat_model.dart';
import '../repository/chat_repository.dart';

class ChatController extends GetxController {
  final _repo = ChatRepository();

  final RxList<ChatConversation> conversations = <ChatConversation>[].obs;
  final Rx<ChatConversation?> activeConversation = Rx(null);
  final RxList<ChatMessage> messages = <ChatMessage>[].obs;
  final RxBool loading = false.obs;
  final RxBool messagesLoading = false.obs;
  final RxBool sending = false.obs;

  AuthController get _auth => Get.find<AuthController>();
  String get _role => _auth.currentRole.value;
  String get _userId => _auth.profile.value?.userId ?? '';
  String get _userName => _auth.profile.value?.name ?? '';

  bool isMine(ChatMessage msg) => msg.senderId == _userId;

  @override
  void onInit() {
    super.onInit();
    loadConversations();
  }

  Future<void> loadConversations() async {
    loading.value = true;
    try {
      conversations.value = await _repo.fetchConversations(role: _role);
    } catch (e) {
      debugPrint('[ChatController] loadConversations: $e');
    } finally {
      loading.value = false;
    }
  }

  Future<void> openConversation(ChatConversation conv) async {
    activeConversation.value = conv;
    messagesLoading.value = true;
    messages.clear();
    try {
      messages.value = await _repo.fetchMessages(conv.id);
    } catch (e) {
      debugPrint('[ChatController] fetchMessages: $e');
    } finally {
      messagesLoading.value = false;
    }
  }

  Future<void> sendMessage(String content) async {
    if (content.trim().isEmpty || activeConversation.value == null) return;
    sending.value = true;
    try {
      final msg = await _repo.sendMessage(
        activeConversation.value!.id,
        content.trim(),
        _userId,
        _userName,
      );
      messages.add(msg);
    } catch (e) {
      debugPrint('[ChatController] sendMessage: $e');
    } finally {
      sending.value = false;
    }
  }
}
