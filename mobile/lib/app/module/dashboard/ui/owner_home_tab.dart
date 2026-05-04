import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../config/routes/app_routes.dart';
import '../../../config/themes/app_theme.dart';
import '../../auth/controller/auth_controller.dart';
import '../controller/dashboard_controller.dart';

class OwnerHomeTab extends StatelessWidget {
  const OwnerHomeTab({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Get.find<AuthController>();
    final ctrl = Get.find<DashboardController>();
    final profile = auth.profile.value;
    final centerName = auth.profile.value?.roles
        .where((r) => r.centerId == auth.currentCenterId.value)
        .firstOrNull
        ?.centerName;

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: ctrl.loadOwnerStats,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          _GreetingHeader(
            name: profile?.name ?? '',
            centerName: centerName,
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
            child: Obx(() => _StatsSection(
                  loading: ctrl.statsLoading.value,
                  stats: ctrl.stats.value,
                )),
          ),
          const SizedBox(height: 24),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: _QuickActionsSection(),
          ),
          const SizedBox(height: 24),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: _MenuSection(),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _GreetingHeader extends StatelessWidget {
  const _GreetingHeader({required this.name, this.centerName});

  final String name;
  final String? centerName;

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
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            name.isNotEmpty ? name : 'Owner',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (centerName != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.business_rounded,
                      color: Colors.white70, size: 13),
                  const SizedBox(width: 5),
                  Text(
                    centerName!,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 4),
          Text(
            DateFormat('EEEE, d MMM yyyy').format(DateTime.now()),
            style: const TextStyle(color: Colors.white54, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _StatsSection extends StatelessWidget {
  const _StatsSection({required this.loading, required this.stats});

  final bool loading;
  final dynamic stats;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Overview',
          style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary),
        ),
        const SizedBox(height: 12),
        if (loading)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
          )
        else
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.6,
            children: [
              _StatCard(
                label: 'Students',
                value: '${stats?.totalStudents ?? 0}',
                icon: Icons.people_rounded,
                iconColor: AppColors.primary,
                iconBg: AppColors.primary.withValues(alpha: 0.1),
              ),
              _StatCard(
                label: 'Batches',
                value: '${stats?.totalBatches ?? 0}',
                icon: Icons.class_rounded,
                iconColor: AppColors.accent,
                iconBg: AppColors.accent.withValues(alpha: 0.1),
              ),
              _StatCard(
                label: 'Pending Fees',
                value: '${stats?.pendingFees ?? 0}',
                icon: Icons.pending_actions_rounded,
                iconColor: AppColors.pending,
                iconBg: AppColors.pending.withValues(alpha: 0.1),
              ),
              _StatCard(
                label: 'Overdue',
                value: stats != null
                    ? '₹${(stats.overdueAmount as double).toStringAsFixed(0)}'
                    : '₹0',
                icon: Icons.warning_amber_rounded,
                iconColor: AppColors.rejected,
                iconBg: AppColors.rejected.withValues(alpha: 0.1),
              ),
            ],
          ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.iconColor,
    required this.iconBg,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color iconColor;
  final Color iconBg;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickActionsSection extends StatelessWidget {
  const _QuickActionsSection();

  @override
  Widget build(BuildContext context) {
    final actions = [
      _Action('Add Student', Icons.person_add_rounded, AppColors.primary,
          AppRoutes.ownerStudents),
      _Action('Mark Fees', Icons.receipt_long_rounded, AppColors.approved,
          AppRoutes.ownerFees),
      _Action('Batches', Icons.class_rounded, AppColors.accent,
          AppRoutes.ownerBatches),
      _Action('Reports', Icons.bar_chart_rounded, AppColors.navy,
          AppRoutes.ownerStudents),
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

class _MenuSection extends StatelessWidget {
  const _MenuSection();

  @override
  Widget build(BuildContext context) {
    final items = [
      _MenuItem(
        Icons.people_rounded,
        'Students',
        'Manage enrolled students',
        AppColors.primary,
        AppRoutes.ownerStudents,
      ),
      _MenuItem(
        Icons.class_rounded,
        'Batches',
        'View and manage batches',
        AppColors.accent,
        AppRoutes.ownerBatches,
      ),
      _MenuItem(
        Icons.receipt_long_rounded,
        'Fee Management',
        'Track payments & dues',
        AppColors.approved,
        AppRoutes.ownerFees,
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Management',
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
