import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../../../auth/controller/auth_controller.dart';
import '../model/parent_summary.dart';
import '../repository/parents_repository.dart';

class ParentsController extends GetxController {
  final _repo = ParentsRepository();

  final RxList<ParentSummary> parents = <ParentSummary>[].obs;
  final RxBool loading = false.obs;
  final RxString searchQuery = ''.obs;

  List<ParentSummary> get filtered {
    final q = searchQuery.value.toLowerCase();
    if (q.isEmpty) return parents;
    return parents
        .where((p) =>
            p.name.toLowerCase().contains(q) ||
            (p.mobileNumber?.contains(q) ?? false))
        .toList();
  }

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    loading.value = true;
    try {
      final centerId = Get.find<AuthController>().currentCenterId.value;
      parents.value = await _repo.fetchParents(centerId);
    } catch (e) {
      debugPrint('[ParentsController] $e');
    } finally {
      loading.value = false;
    }
  }
}
