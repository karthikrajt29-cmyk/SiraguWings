import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../model/nearby_center_model.dart';
import '../repository/nearby_repository.dart';

class NearbyController extends GetxController {
  final _repo = NearbyRepository();

  final RxList<NearbyCenter> centers = <NearbyCenter>[].obs;
  final RxList<ParentUpdate> updates = <ParentUpdate>[].obs;
  final RxBool loading = false.obs;

  @override
  void onInit() {
    super.onInit();
    loadAll();
  }

  Future<void> loadAll() async {
    loading.value = true;
    try {
      final results = await Future.wait([
        _repo.fetchNearbyCenters(),
        _repo.fetchUpdates(),
      ]);
      centers.value = results[0] as List<NearbyCenter>;
      updates.value = results[1] as List<ParentUpdate>;
    } catch (e) {
      debugPrint('[NearbyController] $e');
    } finally {
      loading.value = false;
    }
  }
}
