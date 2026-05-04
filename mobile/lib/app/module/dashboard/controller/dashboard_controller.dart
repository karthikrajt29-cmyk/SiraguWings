import 'package:get/get.dart';

import '../../auth/controller/auth_controller.dart';
import '../model/owner_dashboard_model.dart';
import '../repository/dashboard_repository.dart';

class DashboardController extends GetxController {
  final _repo = DashboardRepository();

  final RxInt tabIndex = 0.obs;
  final Rx<OwnerDashboardStats?> stats = Rx(null);
  final RxBool statsLoading = false.obs;

  String get role => Get.find<AuthController>().currentRole.value;

  void setTab(int i) => tabIndex.value = i;

  Future<void> loadOwnerStats() async {
    final centerId = Get.find<AuthController>().currentCenterId.value;
    if (centerId.isEmpty) return;
    statsLoading.value = true;
    try {
      stats.value = await _repo.fetchOwnerStats(centerId);
    } catch (_) {
    } finally {
      statsLoading.value = false;
    }
  }

  @override
  void onReady() {
    super.onReady();
    if (role == 'Owner') loadOwnerStats();
  }
}
