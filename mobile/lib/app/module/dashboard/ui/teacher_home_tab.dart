import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../config/routes/app_routes.dart';
import '../../../config/themes/app_theme.dart';
import '../../auth/controller/auth_controller.dart';

class TeacherHomeTab extends StatelessWidget {
  const TeacherHomeTab({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Get.find<AuthController>();
    final profile = auth.profile.value;

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        _TeacherHeader(name: profile?.name ?? ''),
        const SizedBox(height: 20),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: _TodayCard(),
        ),
        const SizedBox(height: 20),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: _TeacherQuickActions(),
        ),
        const SizedBox(height: 20),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: _TeacherMenuSection(),
        ),
        const SizedBox(height: 32),
      ],
    );
  }
}

class _TeacherHeader extends StatelessWidget {
  const _TeacherHeader({required this.name});

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
            '$_greeting, Teacher',
            style: const TextStyle(color: Colors.white70, fontSize: 14),
          ),
          const SizedBox(height: 2),
          Text(
            name.isNotEmpty ? name : 'Teacher',
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

class _TodayCard extends StatelessWidget {
  const _TodayCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.accent],
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
            child:
                const Icon(Icons.today_rounded, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mark Today\'s Attendance',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Attendance not yet marked for today',
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () => Get.toNamed(AppRoutes.teacherBatches),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppColors.primary,
              minimumSize: Size.zero,
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Go',
                style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

class _TeacherQuickActions extends StatelessWidget {
  const _TeacherQuickActions();

  @override
  Widget build(BuildContext context) {
    final actions = [
      _Action('My Batches', Icons.class_rounded, AppColors.primary,
          AppRoutes.teacherBatches),
      _Action('Attendance', Icons.fact_check_rounded, AppColors.approved,
          AppRoutes.teacherBatches),
      _Action('Activities', Icons.camera_alt_rounded, AppColors.accent,
          AppRoutes.teacherActivities),
      _Action('Alerts', Icons.notifications_rounded, AppColors.navy,
          AppRoutes.notifications),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Actions',
          style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary),
        ),
        const SizedBox(height: 12),
        Row(
          children: actions
              .map((a) => Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(
                          right: a == actions.last ? 0 : 10),
                      child: _ActionChip(action: a),
                    ),
                  ))
              .toList(),
        ),
      ],
    );
  }
}

class _Action {
  const _Action(this.label, this.icon, this.color, this.route);
  final String label;
  final IconData icon;
  final Color color;
  final String route;
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({required this.action});
  final _Action action;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Get.toNamed(action.route),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: action.color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: action.color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Icon(action.icon, color: action.color, size: 22),
            const SizedBox(height: 6),
            Text(
              action.label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: action.color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TeacherMenuSection extends StatelessWidget {
  const _TeacherMenuSection();

  @override
  Widget build(BuildContext context) {
    final items = [
      _MenuItem(
        Icons.class_rounded,
        'My Batches',
        'View students and schedules',
        AppColors.primary,
        AppRoutes.teacherBatches,
      ),
      _MenuItem(
        Icons.fact_check_rounded,
        'Mark Attendance',
        'Record today\'s student attendance',
        AppColors.approved,
        AppRoutes.teacherBatches,
      ),
      _MenuItem(
        Icons.photo_camera_rounded,
        'Post Activity',
        'Share updates with parents',
        AppColors.accent,
        AppRoutes.teacherActivities,
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'My Work',
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
