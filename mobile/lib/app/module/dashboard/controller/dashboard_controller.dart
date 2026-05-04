import 'package:get/get.dart';

import '../../auth/controller/auth_controller.dart';

class DashboardController extends GetxController {
  final RxInt tabIndex = 0.obs;

  String get role => Get.find<AuthController>().currentRole.value;

  void setTab(int i) => tabIndex.value = i;
}
