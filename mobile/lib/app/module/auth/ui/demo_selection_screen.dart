import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../config/routes/app_routes.dart';
import '../../../config/themes/app_theme.dart';
import '../controller/auth_controller.dart';

class DemoSelectionScreen extends StatelessWidget {
  const DemoSelectionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Get.find<AuthController>();

    final roles = [
      _RoleCard(
        role: 'Parent',
        name: 'Suresh Krishnan',
        description: 'View children, fees, attendance & chat with teachers',
        icon: Icons.family_restroom_rounded,
        color: const Color(0xFF6366F1),
        gradient: const [Color(0xFF6366F1), Color(0xFF8B5CF6)],
      ),
      _RoleCard(
        role: 'Teacher',
        name: 'Ramesh Pillai',
        description: 'Manage batches, mark attendance & send materials',
        icon: Icons.school_rounded,
        color: AppColors.primary,
        gradient: const [Color(0xFFE85D04), Color(0xFFF59E0B)],
      ),
      _RoleCard(
        role: 'Owner',
        name: 'Karthik Rajan',
        description: 'Oversee centers, students, staff, fees & reports',
        icon: Icons.business_rounded,
        color: AppColors.navy,
        gradient: const [Color(0xFF0F1E35), Color(0xFF1E3A5F)],
      ),
      _RoleCard(
        role: 'Admin',
        name: 'Priya Shankar',
        description: 'Full platform access across all centers',
        icon: Icons.admin_panel_settings_rounded,
        color: const Color(0xFF059669),
        gradient: const [Color(0xFF059669), Color(0xFF10B981)],
      ),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      body: SafeArea(
        child: Column(
          children: [
            // ── Header ──────────────────────────────────────────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 28),
              decoration: const BoxDecoration(
                color: AppColors.navy,
                borderRadius:
                    BorderRadius.vertical(bottom: Radius.circular(28)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(Icons.school,
                            color: AppColors.primary, size: 28),
                      ),
                      const SizedBox(width: 12),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'SiraguWings',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'School Management Platform',
                            style: TextStyle(
                                color: Colors.white54, fontSize: 11),
                          ),
                        ],
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                              color: AppColors.primary.withValues(alpha: 0.4)),
                        ),
                        child: const Text(
                          'DEMO',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Choose a role to explore',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Tap any card to instantly enter the app as that role — no login needed.',
                    style: TextStyle(
                        color: Colors.white60, fontSize: 13, height: 1.4),
                  ),
                ],
              ),
            ),

            // ── Role cards ───────────────────────────────────────────────
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                children: [
                  // 2-column grid using rows
                  Row(
                    children: [
                      Expanded(
                        child: _DemoCard(
                          card: roles[0],
                          onTap: () => auth.demoSignIn(roles[0].role),
                          loading: auth.loading,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _DemoCard(
                          card: roles[1],
                          onTap: () => auth.demoSignIn(roles[1].role),
                          loading: auth.loading,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _DemoCard(
                          card: roles[2],
                          onTap: () => auth.demoSignIn(roles[2].role),
                          loading: auth.loading,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _DemoCard(
                          card: roles[3],
                          onTap: () => auth.demoSignIn(roles[3].role),
                          loading: auth.loading,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // ── Login footer ─────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Expanded(child: Divider(color: Color(0xFFCBD5E1))),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text(
                          'or sign in with your account',
                          style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey.shade500),
                        ),
                      ),
                      const Expanded(child: Divider(color: Color(0xFFCBD5E1))),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => Get.toNamed(AppRoutes.login),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.navy,
                        side: const BorderSide(
                            color: Color(0xFFCBD5E1), width: 1.5),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                      ),
                      icon: const Icon(Icons.lock_outline_rounded, size: 18),
                      label: const Text(
                        'Login with Credentials',
                        style: TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 14),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Demo card ─────────────────────────────────────────────────────────────────

class _DemoCard extends StatelessWidget {
  const _DemoCard({
    required this.card,
    required this.onTap,
    required this.loading,
  });

  final _RoleCard card;
  final VoidCallback onTap;
  final RxBool loading;

  @override
  Widget build(BuildContext context) {
    return Obx(() => GestureDetector(
          onTap: loading.value ? null : onTap,
          child: Container(
            height: 170,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: card.gradient,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: card.color.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Stack(
              children: [
                // Background decorative circle
                Positioned(
                  right: -16,
                  top: -16,
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Positioned(
                  right: 12,
                  bottom: -20,
                  child: Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.06),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                // Content
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(card.icon,
                            color: Colors.white, size: 24),
                      ),
                      const Spacer(),
                      Text(
                        card.role == 'Owner' ? 'Center\nOwner' : card.role,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        card.name,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.75),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.play_arrow_rounded,
                                color: Colors.white, size: 12),
                            const SizedBox(width: 3),
                            Text(
                              'Enter as ${card.role}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                // Loading overlay
                if (loading.value)
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Center(
                      child: CircularProgressIndicator(color: Colors.white),
                    ),
                  ),
              ],
            ),
          ),
        ));
  }
}

class _RoleCard {
  const _RoleCard({
    required this.role,
    required this.name,
    required this.description,
    required this.icon,
    required this.color,
    required this.gradient,
  });

  final String role;
  final String name;
  final String description;
  final IconData icon;
  final Color color;
  final List<Color> gradient;
}
