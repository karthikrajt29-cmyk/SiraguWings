import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../model/checkin_model.dart';
import '../repository/checkin_repository.dart';

class CheckInController extends GetxController {
  final _repo = CheckInRepository();

  final RxList<CheckInRecord> history = <CheckInRecord>[].obs;
  final RxBool loading = false.obs;
  final RxBool checkingIn = false.obs;
  final Rx<CheckInRecord?> todayRecord = Rx(null);

  String get todayDate => DateFormat('yyyy-MM-dd').format(DateTime.now());

  @override
  void onInit() {
    super.onInit();
    loadHistory();
  }

  Future<void> loadHistory() async {
    loading.value = true;
    try {
      history.value = await _repo.fetchHistory();
      todayRecord.value = history.firstWhereOrNull(
        (r) => r.date == todayDate,
      );
    } catch (e) {
      debugPrint('[CheckInController] $e');
    } finally {
      loading.value = false;
    }
  }

  /// Called when the QR scanner reads a valid center QR.
  /// Expected format: `SWCENTER:center_id:center_name`
  Future<bool> handleCenterQr(String raw) async {
    final parts = raw.split(':');
    if (parts.length < 2 || parts[0] != 'SWCENTER') return false;
    final centerId = parts[1];
    final centerName = parts.length > 2 ? parts.sublist(2).join(':') : centerId;
    await _performCheckIn(centerId: centerId, centerName: centerName);
    return true;
  }

  Future<void> _performCheckIn({
    required String centerId,
    required String centerName,
  }) async {
    checkingIn.value = true;
    try {
      final pos = await _getLocation();
      final record = await _repo.checkIn(
        centerId: centerId,
        centerName: centerName,
        latitude: pos?.latitude,
        longitude: pos?.longitude,
      );
      history.insert(0, record);
      todayRecord.value = record;
    } catch (e) {
      debugPrint('[CheckInController] checkIn: $e');
      Get.snackbar('Error', 'Check-in failed. Try again.',
          snackPosition: SnackPosition.BOTTOM);
    } finally {
      checkingIn.value = false;
    }
  }

  Future<Position?> _getLocation() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        return null;
      }
      return await Geolocator.getCurrentPosition(
        locationSettings:
            const LocationSettings(accuracy: LocationAccuracy.medium),
      );
    } catch (e) {
      debugPrint('[CheckInController] geo: $e');
      return null;
    }
  }
}
