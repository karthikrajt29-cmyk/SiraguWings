import 'package:get/get.dart';

import '../../auth/controller/auth_controller.dart';
import '../model/owner_dashboard_model.dart';
import '../repository/dashboard_repository.dart';

// Sentinel value meaning "show aggregate across all centers".
const kAllCenters = '__all__';

class DashboardController extends GetxController {
  final _repo = DashboardRepository();

  final RxInt tabIndex = 0.obs;
  final Rx<OwnerDashboardStats?> stats = Rx(null);
  final RxBool statsLoading = false.obs;

  // Which center card is highlighted in the dashboard selector.
  // Can be kAllCenters or a specific centerId.
  final RxString viewCenterId = kAllCenters.obs;

  String get role => Get.find<AuthController>().currentRole.value;

  void setTab(int i) => tabIndex.value = i;

  // Called when user taps a specific center card.
  Future<void> switchCenter(String centerId) async {
    viewCenterId.value = centerId;
    final auth = Get.find<AuthController>();
    await auth.switchCenter(centerId);
    await _loadStats(centerId);
  }

  // Called when user taps the "Overall" card.
  Future<void> showOverall() async {
    viewCenterId.value = kAllCenters;
    await loadOwnerStats();
  }

  // Public refresh — respects current viewCenterId.
  Future<void> loadOwnerStats() async {
    if (viewCenterId.value == kAllCenters) {
      await _loadAllStats();
    } else {
      await _loadStats(viewCenterId.value);
    }
  }

  Future<void> _loadStats(String centerId) async {
    if (centerId.isEmpty) return;
    statsLoading.value = true;
    try {
      stats.value = await _repo.fetchOwnerStats(centerId);
    } catch (_) {
    } finally {
      statsLoading.value = false;
    }
  }

  Future<void> _loadAllStats() async {
    final auth = Get.find<AuthController>();
    final centerIds = auth.profile.value?.roles
            .where((r) => r.role == 'Owner' && r.centerId != null)
            .map((r) => r.centerId!)
            .toList() ??
        [];
    if (centerIds.isEmpty) return;

    statsLoading.value = true;
    try {
      final results = await Future.wait(
        centerIds.map((id) => _repo.fetchOwnerStats(id)),
      );
      // Aggregate by summing all centers.
      stats.value = results.reduce(
        (a, b) => OwnerDashboardStats(
          totalStudents: a.totalStudents + b.totalStudents,
          totalBatches: a.totalBatches + b.totalBatches,
          pendingFees: a.pendingFees + b.pendingFees,
          overdueAmount: a.overdueAmount + b.overdueAmount,
        ),
      );
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
