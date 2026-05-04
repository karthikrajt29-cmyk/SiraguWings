import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../config/themes/app_theme.dart';
import '../controller/auth_controller.dart';

class RolePickerScreen extends StatelessWidget {
  const RolePickerScreen({super.key});

  IconData _iconForRole(String role) {
    switch (role) {
      case 'Owner': return Icons.business;
      case 'Parent': return Icons.family_restroom;
      case 'Teacher': return Icons.school;
      default: return Icons.person;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Get.find<AuthController>();
    final profile = auth.profile.value;
    if (profile == null) return const SizedBox.shrink();

    // Deduplicate roles keeping the first center for each.
    final roleMap = <String, String?>{};
    for (final r in profile.roles) {
      roleMap.putIfAbsent(r.role, () => r.centerId);
    }

    return Scaffold(
      backgroundColor: AppColors.navy,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 32),
              const Text(
                'Choose your role',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Welcome, ${profile.name}',
                style: const TextStyle(color: Colors.white60),
              ),
              const SizedBox(height: 40),
              ...roleMap.entries.map((e) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _RoleTile(
                      role: e.key,
                      centerId: e.value ?? '',
                      icon: _iconForRole(e.key),
                      onTap: () => auth.selectRole(e.key, e.value ?? ''),
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleTile extends StatelessWidget {
  const _RoleTile({
    required this.role,
    required this.centerId,
    required this.icon,
    required this.onTap,
  });

  final String role;
  final String centerId;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white10,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: AppColors.primary, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  role,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.white54),
            ],
          ),
        ),
      ),
    );
  }
}
