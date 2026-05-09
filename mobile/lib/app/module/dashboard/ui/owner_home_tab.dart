import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../config/routes/app_routes.dart';
import '../../../config/themes/app_theme.dart';
import '../../auth/controller/auth_controller.dart';
import '../../auth/model/user_profile.dart';
import '../controller/dashboard_controller.dart';


class OwnerHomeTab extends StatelessWidget {
  const OwnerHomeTab({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Get.find<AuthController>();
    final ctrl = Get.find<DashboardController>();

    // All Owner role entries (one per center).
    final ownerRoles = auth.profile.value?.roles
            .where((r) => r.role == 'Owner' && r.centerId != null)
            .toList() ??
        [];

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: ctrl.loadOwnerStats,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _GreetingHeader(auth: auth)),
          SliverToBoxAdapter(
            child: _CenterSelector(
              ownerRoles: ownerRoles,
              ctrl: ctrl,
              auth: auth,
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
              child: Obx(() => _StatsSection(
                    loading: ctrl.statsLoading.value,
                    stats: ctrl.stats.value,
                  )),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: _QuickActionsSection(),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: _ManagementMenu(),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 40)),
        ],
      ),
    );
  }
}

// ── Greeting header ──────────────────────────────────────────────────────────

class _GreetingHeader extends StatelessWidget {
  const _GreetingHeader({required this.auth});
  final AuthController auth;

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
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
      decoration: const BoxDecoration(
        color: AppColors.navy,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _greeting,
                  style: const TextStyle(color: Colors.white60, fontSize: 13),
                ),
                const SizedBox(height: 2),
                Obx(() => Text(
                      auth.profile.value?.name ?? 'Owner',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    )),
                const SizedBox(height: 4),
                Text(
                  DateFormat('EEEE, d MMM yyyy').format(DateTime.now()),
                  style: const TextStyle(color: Colors.white38, fontSize: 11),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white24),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.business_center_rounded,
                    color: Colors.white70, size: 13),
                const SizedBox(width: 5),
                const Text(
                  'Owner',
                  style: TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                      fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Center selector ──────────────────────────────────────────────────────────

class _CenterSelector extends StatelessWidget {
  const _CenterSelector({
    required this.ownerRoles,
    required this.ctrl,
    required this.auth,
  });

  final List<RoleEntry> ownerRoles;
  final DashboardController ctrl;
  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    if (ownerRoles.isEmpty) return const SizedBox.shrink();

    return Container(
      color: AppColors.navy,
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Row(
              children: [
                const Text(
                  'MY CENTERS',
                  style: TextStyle(
                    color: Colors.white38,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.0,
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () => Get.toNamed(AppRoutes.ownerCenterSwitcher),
                  child: const Text(
                    'Details',
                    style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 11,
                        fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            height: 88,
            child: Obx(() {
              final view = ctrl.viewCenterId.value;
              return ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  // Overall card (always first)
                  _OverallCard(
                    selected: view == kAllCenters,
                    centerCount: ownerRoles.length,
                    onTap: () {
                      if (view != kAllCenters) ctrl.showOverall();
                    },
                  ),
                  const SizedBox(width: 10),
                  // Individual center cards
                  ...ownerRoles.map((entry) {
                    final selected = view == entry.centerId;
                    return Padding(
                      padding: const EdgeInsets.only(right: 10),
                      child: _CenterCard(
                        entry: entry,
                        selected: selected,
                        onTap: () {
                          if (!selected) ctrl.switchCenter(entry.centerId!);
                        },
                      ),
                    );
                  }),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _OverallCard extends StatelessWidget {
  const _OverallCard({
    required this.selected,
    required this.centerCount,
    required this.onTap,
  });

  final bool selected;
  final int centerCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        width: 130,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: selected
              ? Colors.white
              : Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? Colors.white : Colors.white.withValues(alpha: 0.15),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(
                  Icons.dashboard_rounded,
                  size: 14,
                  color: selected ? AppColors.navy : Colors.white60,
                ),
                const Spacer(),
                if (selected)
                  Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Overall',
                  style: TextStyle(
                    color: selected ? AppColors.navy : Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  '$centerCount centers',
                  style: TextStyle(
                    color: selected ? AppColors.textSecondary : Colors.white38,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CenterCard extends StatelessWidget {
  const _CenterCard({
    required this.entry,
    required this.selected,
    required this.onTap,
  });

  final RoleEntry entry;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    // Shorten name: "SiraguWings Velachery" → "Velachery"
    final shortName = (entry.centerName ?? 'Center')
        .replaceAll('SiraguWings', '')
        .trim();

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        width: 150,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary
              : Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected
                ? AppColors.primary
                : Colors.white.withValues(alpha: 0.15),
            width: selected ? 0 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(
                  Icons.store_rounded,
                  size: 14,
                  color: selected ? Colors.white : Colors.white60,
                ),
                const Spacer(),
                if (selected)
                  Container(
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                  ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  shortName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: selected ? Colors.white : Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  selected ? 'Active' : 'Tap to switch',
                  style: TextStyle(
                    color: selected
                        ? Colors.white70
                        : Colors.white38,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Stats section ────────────────────────────────────────────────────────────

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
              padding: EdgeInsets.symmetric(vertical: 28),
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
            childAspectRatio: 1.65,
            children: [
              _StatCard(
                label: 'Students',
                value: '${stats?.totalStudents ?? 0}',
                icon: Icons.people_rounded,
                iconColor: AppColors.primary,
                iconBg: AppColors.primary.withValues(alpha: 0.1),
                onTap: () => Get.toNamed(AppRoutes.ownerStudents),
              ),
              _StatCard(
                label: 'Batches',
                value: '${stats?.totalBatches ?? 0}',
                icon: Icons.class_rounded,
                iconColor: AppColors.accent,
                iconBg: AppColors.accent.withValues(alpha: 0.1),
                onTap: () => Get.toNamed(AppRoutes.ownerBatches),
              ),
              _StatCard(
                label: 'Pending Fees',
                value: '${stats?.pendingFees ?? 0}',
                icon: Icons.pending_actions_rounded,
                iconColor: AppColors.pending,
                iconBg: AppColors.pending.withValues(alpha: 0.1),
                onTap: () => Get.toNamed(AppRoutes.ownerFees),
              ),
              _StatCard(
                label: 'Overdue',
                value: stats != null
                    ? '₹${(stats.overdueAmount as double).toStringAsFixed(0)}'
                    : '₹0',
                icon: Icons.warning_amber_rounded,
                iconColor: AppColors.rejected,
                iconBg: AppColors.rejected.withValues(alpha: 0.1),
                onTap: () => Get.toNamed(AppRoutes.ownerFees),
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
    this.onTap,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
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
            const SizedBox(width: 10),
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
            if (onTap != null)
              const Icon(Icons.chevron_right,
                  size: 16, color: AppColors.border),
          ],
        ),
      ),
    );
  }
}

// ── Quick actions ────────────────────────────────────────────────────────────

class _QuickActionsSection extends StatelessWidget {
  const _QuickActionsSection();

  @override
  Widget build(BuildContext context) {
    final actions = [
      _Action('Add Student', Icons.person_add_rounded, AppColors.primary,
          AppRoutes.ownerStudents),
      _Action('Fees', Icons.receipt_long_rounded, AppColors.approved,
          AppRoutes.ownerFees),
      _Action('Attendance', Icons.fact_check_rounded, AppColors.accent,
          AppRoutes.ownerAttendance),
      _Action('Reports', Icons.bar_chart_rounded, AppColors.navy,
          AppRoutes.ownerReports),
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

// ── Management menu ──────────────────────────────────────────────────────────

class _ManagementMenu extends StatelessWidget {
  const _ManagementMenu();

  @override
  Widget build(BuildContext context) {
    final items = [
      _MenuItem(Icons.people_rounded, 'Students', 'Manage enrolled students',
          AppColors.primary, AppRoutes.ownerStudents),
      _MenuItem(Icons.class_rounded, 'Batches', 'View and manage batches',
          AppColors.accent, AppRoutes.ownerBatches),
      _MenuItem(Icons.receipt_long_rounded, 'Fee Management',
          'Track payments & dues', AppColors.approved, AppRoutes.ownerFees),
      _MenuItem(Icons.person_rounded, 'Staff', 'Teachers and instructors',
          AppColors.navy, AppRoutes.ownerStaff),
      _MenuItem(Icons.family_restroom_rounded, 'Parents',
          'Parent contacts & kids', AppColors.pending, AppRoutes.ownerParents),
      _MenuItem(Icons.bar_chart_rounded, 'Reports', 'Revenue & attendance',
          AppColors.rejected, AppRoutes.ownerReports),
      _MenuItem(Icons.fact_check_rounded, 'Attendance',
          'Daily attendance overview', AppColors.accent,
          AppRoutes.ownerAttendance),
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
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
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
  const _MenuItem(
      this.icon, this.title, this.subtitle, this.color, this.route);
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final String route;
}
