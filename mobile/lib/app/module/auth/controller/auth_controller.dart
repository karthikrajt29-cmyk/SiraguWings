import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get/get.dart';

import '../../../config/routes/app_routes.dart';
import '../../../constants/storage_keys.dart';
import '../model/user_profile.dart';
import '../repository/auth_repository.dart';

class AuthController extends GetxController {
  final _repo = AuthRepository();
  final _secure = const FlutterSecureStorage();

  final Rx<UserProfile?> profile = Rx(null);
  final RxString currentRole = ''.obs;
  final RxString currentCenterId = ''.obs;
  final RxBool loading = false.obs;

  @override
  void onInit() {
    super.onInit();
    FirebaseAuth.instance.authStateChanges().listen(_onAuthStateChanged);
  }

  Future<void> _onAuthStateChanged(User? user) async {
    if (user == null) {
      profile.value = null;
      currentRole.value = '';
      // Guard: don't push /login if already there — prevents infinite loop
      // when AppBinding re-creates this controller on each route change.
      if (Get.currentRoute != AppRoutes.login) {
        Get.offAllNamed(AppRoutes.login);
      }
      return;
    }
    await _loadProfile();
  }

  Future<void> _loadProfile() async {
    loading.value = true;
    try {
      final p = await _repo.fetchProfile();
      profile.value = p;

      // Restore last-used role from secure storage.
      final savedRole = await _secure.read(key: StorageKeys.selectedRole);
      final savedCenter = await _secure.read(key: StorageKeys.selectedCenterId);

      if (savedRole != null && p.hasRole(savedRole)) {
        currentRole.value = savedRole;
        currentCenterId.value = savedCenter ?? '';
      } else if (p.distinctRoles.length == 1) {
        final role = p.distinctRoles.first;
        final center = p.roles
            .firstWhereOrNull((r) => r.role == role)
            ?.centerId ?? '';
        await _setRole(role, center);
      } else {
        Get.offAllNamed(AppRoutes.rolePicker);
        return;
      }

      await _registerFcmToken();
      Get.offAllNamed(AppRoutes.home);
    } catch (e) {
      debugPrint('[AuthController] load profile error: $e');
      Get.snackbar('Error', 'Could not load profile. Please try again.');
    } finally {
      loading.value = false;
    }
  }

  Future<void> signInWithEmail(String email, String password) async {
    loading.value = true;
    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      Get.snackbar('Login failed', e.message ?? 'Unknown error');
    } finally {
      loading.value = false;
    }
  }

  Future<void> selectRole(String role, String centerId) async {
    await _setRole(role, centerId);
    Get.offAllNamed(AppRoutes.home);
  }

  Future<void> _setRole(String role, String centerId) async {
    currentRole.value = role;
    currentCenterId.value = centerId;
    await _secure.write(key: StorageKeys.selectedRole, value: role);
    await _secure.write(key: StorageKeys.selectedCenterId, value: centerId);
  }

  Future<void> switchRole(String role, String centerId) async {
    await _setRole(role, centerId);
    Get.offAllNamed(AppRoutes.home);
  }

  Future<void> logout() async {
    final fcmToken = await FirebaseMessaging.instance.getToken();
    if (fcmToken != null) {
      try { await _repo.removeDevice(fcmToken); } catch (_) {}
    }
    await _secure.deleteAll();
    await FirebaseAuth.instance.signOut();
  }

  Future<void> _registerFcmToken() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null) return;
      final platform = kIsWeb ? 'Web' : (Platform.isIOS ? 'iOS' : 'Android');
      await _repo.registerDevice(token, platform);
    } catch (e) {
      debugPrint('[AuthController] FCM register error: $e');
    }
  }
}
