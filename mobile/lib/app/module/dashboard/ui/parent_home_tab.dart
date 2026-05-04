import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../config/routes/app_routes.dart';
import '../../../config/themes/app_theme.dart';
import '../../auth/controller/auth_controller.dart';

class ParentHomeTab extends StatelessWidget {
  const ParentHomeTab({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Get.find<AuthController>();
    final profile = auth.profile.value;

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        _ParentHeader(name: profile?.name ?? ''),
        const SizedBox(height: 20),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: _SosCard(),
        ),
        const SizedBox(height: 20),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: _ParentMenuSection(),
        ),
        const SizedBox(height: 32),
      ],
    );
  }
}

class _ParentHeader extends StatelessWidget {
  const _ParentHeader({required this.name});

  final String name;

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
      decoration: const BoxDecoration(
        color: AppColors.navy,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$_greeting,',
            style: const TextStyle(color: Colors.white70, fontSize: 14),
          ),
          const SizedBox(height: 2),
          Text(
            name.isNotEmpty ? name : 'Parent',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            DateFormat('EEEE, d MMM yyyy').format(DateTime.now()),
            style: const TextStyle(color: Colors.white54, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _SosCard extends StatelessWidget {
  const _SosCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.rejected,
            AppColors.rejected.withValues(alpha: 0.7),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.sos_rounded, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Emergency SOS',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Tap to send emergency alert to center',
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () => Get.toNamed(AppRoutes.sos),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppColors.rejected,
              minimumSize: Size.zero,
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('SOS',
                style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

class _ParentMenuSection extends StatelessWidget {
  const _ParentMenuSection();

  @override
  Widget build(BuildContext context) {
    final items = [
      _MenuItem(
        Icons.child_care_rounded,
        'My Children',
        'View attendance & batch schedules',
        AppColors.primary,
        AppRoutes.parentChildren,
      ),
      _MenuItem(
        Icons.receipt_long_rounded,
        'Fee Payments',
        'View outstanding dues & history',
        AppColors.approved,
        AppRoutes.parentFees,
      ),
      _MenuItem(
        Icons.calendar_month_rounded,
        'Attendance',
        'Track your child\'s attendance',
        AppColors.accent,
        AppRoutes.parentChildren,
      ),
      _MenuItem(
        Icons.notifications_rounded,
        'Notifications',
        'Alerts and updates from center',
        AppColors.navy,
        AppRoutes.notifications,
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Access',
          style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: items.map((item) {
              final isLast = item == items.last;
              return Column(
                children: [
                  ListTile(
                    onTap: () => Get.toNamed(item.route),
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    leading: Container(
                      padding: const EdgeInsets.all(9),
                      decoration: BoxDecoration(
                        color: item.color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(item.icon, color: item.color, size: 20),
                    ),
                    title: Text(item.title,
                        style: const TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w600)),
                    subtitle: Text(item.subtitle,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textSecondary)),
                    trailing: const Icon(Icons.chevron_right,
                        color: AppColors.textSecondary, size: 20),
                  ),
                  if (!isLast)
                    const Divider(height: 1, indent: 56, endIndent: 16),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _MenuItem {
  const _MenuItem(this.icon, this.title, this.subtitle, this.color, this.route);
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final String route;
}
