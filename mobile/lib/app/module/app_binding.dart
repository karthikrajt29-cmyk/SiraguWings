import 'package:get/get.dart';

import 'auth/controller/auth_controller.dart';
import 'dashboard/controller/dashboard_controller.dart';
import 'notification/controller/notification_controller.dart';
import 'sos/controller/sos_controller.dart';
import 'teacher/batches/controller/teacher_batch_controller.dart';
import 'teacher/checkin/controller/checkin_controller.dart';
import 'parent/children/controller/children_controller.dart';
import 'parent/nearby/controller/nearby_controller.dart';
import 'chat/controller/chat_controller.dart';
import 'materials/controller/material_controller.dart';
import 'announcements/controller/announcement_controller.dart';
import '../service/api/api_client.dart';

class AppBinding extends Bindings {
  @override
  void dependencies() {
    // permanent=true → never deleted when routes are removed, preventing
    // the infinite loop where each new route re-creates these singletons.
    if (!Get.isRegistered<ApiClient>()) {
      Get.put<ApiClient>(ApiClient(), permanent: true);
    }
    if (!Get.isRegistered<AuthController>()) {
      Get.put<AuthController>(AuthController(), permanent: true);
    }
    Get.lazyPut<DashboardController>(() => DashboardController(), fenix: true);
    Get.lazyPut<NotificationController>(() => NotificationController(), fenix: true);
    Get.lazyPut<SosController>(() => SosController(), fenix: true);
    Get.lazyPut<TeacherBatchController>(() => TeacherBatchController(), fenix: true);
    Get.lazyPut<CheckInController>(() => CheckInController(), fenix: true);
    Get.lazyPut<ChildrenController>(() => ChildrenController(), fenix: true);
    Get.lazyPut<NearbyController>(() => NearbyController(), fenix: true);
    Get.lazyPut<ChatController>(() => ChatController(), fenix: true);
    Get.lazyPut<MaterialController>(() => MaterialController(), fenix: true);
    Get.lazyPut<AnnouncementController>(() => AnnouncementController(), fenix: true);
  }
}
