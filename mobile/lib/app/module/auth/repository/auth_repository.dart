import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:get/get.dart' hide Response;

import '../../../service/api/api_client.dart';
import '../model/user_profile.dart';

class AuthRepository {
  final Dio _dio = Get.find<ApiClient>().dio;

  Future<UserProfile> fetchProfile() async {
    final idToken = await FirebaseAuth.instance.currentUser!.getIdToken();
    final res = await _dio.post('/auth/token', data: {
      'firebase_id_token': idToken,
    });
    return UserProfile.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> registerDevice(String fcmToken, String platform) async {
    await _dio.post('/me/devices', data: {
      'token': fcmToken,
      'platform': platform,
    });
  }

  Future<void> removeDevice(String fcmToken) async {
    await _dio.delete('/me/devices/$fcmToken');
  }
}
