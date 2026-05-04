import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../model/notification_model.dart';
import '../repository/notification_repository.dart';

class NotificationController extends GetxController {
  final _repo = NotificationRepository();

  final RxList<NotificationItem> items = <NotificationItem>[].obs;
  final RxBool loading = false.obs;

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    loading.value = true;
    try {
      items.value = await _repo.fetchNotifications();
    } catch (e) {
      debugPrint('[NotificationController] error: $e');
    } finally {
      loading.value = false;
    }
  }

  Future<void> markRead(String id) async {
    try {
      await _repo.markRead(id);
      final idx = items.indexWhere((n) => n.id == id);
      if (idx >= 0) {
        final old = items[idx];
        items[idx] = NotificationItem(
          id: old.id,
          centerName: old.centerName,
          type: old.type,
          category: old.category,
          title: old.title,
          body: old.body,
          readAt: DateTime.now(),
          createdDate: old.createdDate,
        );
      }
    } catch (_) {}
  }

  Future<void> markAllRead() async {
    try {
      await _repo.markAllRead();
      await load();
    } catch (_) {}
  }

  int get unreadCount => items.where((n) => !n.isRead).length;
}
