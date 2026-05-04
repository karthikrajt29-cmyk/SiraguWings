import 'package:get/get.dart';

import 'auth/controller/auth_controller.dart';
import 'dashboard/controller/dashboard_controller.dart';
import 'notification/controller/notification_controller.dart';
import 'sos/controller/sos_controller.dart';
import 'teacher/batches/controller/teacher_batch_controller.dart';
import 'parent/children/controller/children_controller.dart';
import '../service/api/api_client.dart';

class AppBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<ApiClient>(() => ApiClient(), fenix: true);
    Get.lazyPut<AuthController>(() => AuthController(), fenix: true);
    Get.lazyPut<DashboardController>(() => DashboardController(), fenix: true);
    Get.lazyPut<NotificationController>(() => NotificationController(), fenix: true);
    Get.lazyPut<SosController>(() => SosController(), fenix: true);
    Get.lazyPut<TeacherBatchController>(() => TeacherBatchController(), fenix: true);
    Get.lazyPut<ChildrenController>(() => ChildrenController(), fenix: true);
  }
}
