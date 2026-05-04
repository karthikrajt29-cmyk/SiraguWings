import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:get/get.dart';

import '../../auth/controller/auth_controller.dart';
import '../model/sos_model.dart';
import '../repository/sos_repository.dart';

class SosController extends GetxController {
  final _repo = SosRepository();

  final RxBool sending = false.obs;
  final RxList<SosAlertItem> alerts = <SosAlertItem>[].obs;
  final RxBool loadingAlerts = false.obs;

  Future<void> raiseAlert() async {
    final confirmed = await Get.dialog<bool>(
      AlertDialog(
        title: const Text('Raise SOS Alert?'),
        content: const Text(
          'This will notify the center owner and platform admins immediately.',
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(result: false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Get.back(result: true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('SEND SOS'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;
    sending.value = true;

    try {
      Position? pos;
      try {
        final permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.always ||
            permission == LocationPermission.whileInUse) {
          pos = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.high,
              timeLimit: Duration(seconds: 10),
            ),
          );
        }
      } catch (_) {
        // Location is optional — SOS still goes through.
      }

      final auth = Get.find<AuthController>();
      await _repo.raiseAlert(
        centerId: auth.currentCenterId.value.isNotEmpty
            ? auth.currentCenterId.value
            : null,
        latitude: pos?.latitude,
        longitude: pos?.longitude,
        accuracyMeters: pos?.accuracy,
        sourceRole: auth.currentRole.value,
      );

      Get.snackbar(
        'SOS Sent',
        'Help is on the way. Stay calm.',
        backgroundColor: Colors.red,
        colorText: Colors.white,
        duration: const Duration(seconds: 5),
      );
    } catch (e) {
      Get.snackbar('Error', 'Could not send SOS. Try again.');
      debugPrint('[SosController] error: $e');
    } finally {
      sending.value = false;
    }
  }

  Future<void> loadAlerts() async {
    loadingAlerts.value = true;
    try {
      alerts.value = await _repo.listAlerts();
    } catch (e) {
      debugPrint('[SosController] loadAlerts error: $e');
    } finally {
      loadingAlerts.value = false;
    }
  }
}
