import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get/get.dart';

import '../../../config/app_flags.dart';
import '../../../config/routes/app_routes.dart';
import '../../../constants/storage_keys.dart';
import '../model/user_profile.dart';
import '../repository/auth_repository.dart';
import '../service/mock_auth_service.dart';

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
    if (!AppFlags.useMockData) {
      FirebaseAuth.instance.authStateChanges().listen(_onAuthStateChanged);
    } else {
      _mockInit();
    }
  }

  Future<void> _mockInit() async {
    // Give the splash screen one frame to render, then decide where to go.
    await Future<void>.delayed(const Duration(milliseconds: 800));
    final savedRole = await _secure.read(key: StorageKeys.selectedRole);
    if (savedRole != null && savedRole.isNotEmpty) {
      // Restore session: re-hydrate the demo profile and skip login.
      try {
        final p = await MockAuthService.loadProfileForRole(savedRole);
        await _hydrateAndRoute(p);
        return;
      } catch (_) {}
    }
    Get.offAllNamed(AppRoutes.demoSelect);
  }

  Future<void> _onAuthStateChanged(User? user) async {
    if (user == null) {
      profile.value = null;
      currentRole.value = '';
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
      await _hydrateAndRoute(p);
    } catch (e) {
      debugPrint('[AuthController] load profile error: $e');
      Get.snackbar('Error', 'Could not load profile. Please try again.');
    } finally {
      loading.value = false;
    }
  }

  Future<void> _hydrateAndRoute(UserProfile p) async {
    profile.value = p;
    final savedRole = await _secure.read(key: StorageKeys.selectedRole);
    final savedCenter = await _secure.read(key: StorageKeys.selectedCenterId);

    if (savedRole != null && p.hasRole(savedRole)) {
      currentRole.value = savedRole;
      currentCenterId.value = savedCenter ?? '';
    } else if (p.distinctRoles.length == 1) {
      final role = p.distinctRoles.first;
      final center = p.roles
              .firstWhereOrNull((r) => r.role == role)
              ?.centerId ??
          '';
      await _setRole(role, center);
    } else {
      Get.offAllNamed(AppRoutes.rolePicker);
      return;
    }

    if (!AppFlags.useMockData) await _registerFcmToken();
    Get.offAllNamed(AppRoutes.home);
  }

  Future<void> signInWithEmail(String email, String password) async {
    loading.value = true;
    try {
      if (AppFlags.useMockData) {
        final p = await MockAuthService.signIn(email, password);
        if (p == null) {
          Get.snackbar('Login failed', 'Invalid email or password');
          return;
        }
        await _hydrateAndRoute(p);
      } else {
        await FirebaseAuth.instance.signInWithEmailAndPassword(
          email: email,
          password: password,
        );
      }
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

  Future<void> switchCenter(String centerId) async {
    final role = currentRole.value;
    if (role.isEmpty) return;
    await _setRole(role, centerId);
  }

  Future<void> demoSignIn(String role) async {
    loading.value = true;
    try {
      final p = await MockAuthService.loadProfileForRole(role);
      profile.value = p;
      final centerId = p.roles.firstOrNull?.centerId ?? '';
      await _setRole(role, centerId);
      Get.offAllNamed(AppRoutes.home);
    } catch (e) {
      debugPrint('[AuthController] demoSignIn: $e');
      Get.snackbar('Error', 'Could not load demo profile.');
    } finally {
      loading.value = false;
    }
  }

  Future<void> logout() async {
    await _secure.deleteAll();
    if (AppFlags.useMockData) {
      profile.value = null;
      currentRole.value = '';
      currentCenterId.value = '';
      Get.offAllNamed(AppRoutes.demoSelect);
      return;
    }
    final fcmToken = await FirebaseMessaging.instance.getToken();
    if (fcmToken != null) {
      try {
        await _repo.removeDevice(fcmToken);
      } catch (_) {}
    }
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
