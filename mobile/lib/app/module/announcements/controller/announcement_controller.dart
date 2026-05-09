import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../../auth/controller/auth_controller.dart';
import '../model/announcement_model.dart';
import '../repository/announcement_repository.dart';

class AnnouncementController extends GetxController {
  final _repo = AnnouncementRepository();

  final RxList<Announcement> announcements = <Announcement>[].obs;
  final RxBool loading = false.obs;
  final RxBool sending = false.obs;

  String get _userName => Get.find<AuthController>().profile.value?.name ?? '';

  @override
  void onInit() {
    super.onInit();
    loadAnnouncements();
  }

  Future<void> loadAnnouncements() async {
    loading.value = true;
    try {
      announcements.value = await _repo.fetchAnnouncements();
    } catch (e) {
      debugPrint('[AnnouncementController] loadAnnouncements: $e');
    } finally {
      loading.value = false;
    }
  }

  Future<void> sendAnnouncement({
    required String title,
    required String body,
    required String targetBatch,
  }) async {
    if (title.trim().isEmpty || body.trim().isEmpty) return;
    sending.value = true;
    try {
      final ann = await _repo.sendAnnouncement(
        title: title.trim(),
        body: body.trim(),
        targetBatch: targetBatch,
        senderName: _userName,
      );
      announcements.insert(0, ann);
      Get.snackbar('Sent', 'Announcement delivered to parents.',
          snackPosition: SnackPosition.BOTTOM,
          duration: const Duration(seconds: 3));
    } catch (e) {
      Get.snackbar('Error', 'Could not send announcement.',
          snackPosition: SnackPosition.BOTTOM);
      debugPrint('[AnnouncementController] sendAnnouncement: $e');
    } finally {
      sending.value = false;
    }
  }
}
