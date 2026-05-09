import 'dart:convert';

import 'package:flutter/services.dart';

import '../model/user_profile.dart';

/// Mock auth: validates email/password against assets/mock/auth/users.json
/// and hydrates the referenced profile JSON. No Firebase, no network.
class MockAuthService {
  static Future<UserProfile?> signIn(String email, String password) async {
    final usersRaw =
        await rootBundle.loadString('assets/mock/auth/users.json');
    final users = jsonDecode(usersRaw) as Map<String, dynamic>;
    final entry = users[email.trim().toLowerCase()] as Map<String, dynamic>?;
    if (entry == null) return null;
    if (entry['password'] != password) return null;
    final profileFile = entry['profile_file'] as String;
    final profileRaw = await rootBundle.loadString('assets/mock/$profileFile');
    return UserProfile.fromJson(
      jsonDecode(profileRaw) as Map<String, dynamic>,
    );
  }

  /// Rehydrates the demo profile directly (used on mock cold-start restore).
  static Future<UserProfile> loadOwnerParentProfile() async {
    final raw = await rootBundle
        .loadString('assets/mock/auth/profile_owner_parent.json');
    return UserProfile.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  /// Loads a mock profile for the given demo role without credentials.
  static Future<UserProfile> loadProfileForRole(String role) async {
    final file = switch (role) {
      'Parent' => 'auth/profile_parent.json',
      'Teacher' => 'auth/profile_teacher.json',
      'Admin' => 'auth/profile_admin.json',
      _ => 'auth/profile_owner_parent.json',
    };
    final raw = await rootBundle.loadString('assets/mock/$file');
    return UserProfile.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }
}
