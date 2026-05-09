import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../../../auth/controller/auth_controller.dart';
import '../model/center_summary.dart';
import '../repository/centers_repository.dart';

class CentersController extends GetxController {
  final _repo = CentersRepository();

  final RxList<CenterSummary> centers = <CenterSummary>[].obs;
  final RxBool loading = false.obs;

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    loading.value = true;
    try {
      centers.value = await _repo.fetchCenters();
    } catch (e) {
      debugPrint('[CentersController] $e');
    } finally {
      loading.value = false;
    }
  }

  Future<void> selectCenter(CenterSummary center) async {
    final auth = Get.find<AuthController>();
    await auth.switchCenter(center.id);
    Get.back();
  }
}
