import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../config/routes/app_routes.dart';
import '../../../config/themes/app_theme.dart';
import '../../auth/controller/auth_controller.dart';
import '../../materials/controller/material_controller.dart';
import '../../materials/model/material_model.dart';
import '../../parent/children/controller/children_controller.dart';
import '../../parent/children/model/child_model.dart';
import '../../parent/nearby/controller/nearby_controller.dart';
import '../../parent/nearby/model/nearby_center_model.dart';

class ParentHomeTab extends StatelessWidget {
  const ParentHomeTab({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Get.find<AuthController>();
    final childCtrl = Get.find<ChildrenController>();
    final nearbyCtrl = Get.find<NearbyController>();
    final matCtrl = Get.find<MaterialController>();

    // Auto-load first child's attendance when children are available
    ever(childCtrl.children, (kids) {
      if (kids.isNotEmpty && childCtrl.attendance.isEmpty) {
        childCtrl.openChild(kids.first);
      }
    });

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async {
        await Future.wait([
          childCtrl.loadChildren(),
          nearbyCtrl.loadAll(),
          matCtrl.loadMaterials(),
        ]);
      },
      child: CustomScrollView(
        slivers: [
          // ── Header ─────────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Obx(() {
              final name = auth.profile.value?.name ?? '';
              return _PremiumHeader(name: name);
            }),
          ),

          // ── Child profile card ──────────────────────────────────────────
          SliverToBoxAdapter(
            child: Obx(() {
              final loading = childCtrl.loading.value;
              final children = childCtrl.children.toList();
              final attendance = childCtrl.attendance.toList();
              final attLoading = childCtrl.attendanceLoading.value;
              return _ChildProfileCard(
                loading: loading,
                children: children,
                attendance: attendance,
                attLoading: attLoading,
              );
            }),
          ),

          // ── Quick stats row ─────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Obx(() {
              final attendance = childCtrl.attendance.toList();
              return _QuickStats(attendance: attendance);
            }),
          ),

          // ── Updates timeline ────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Obx(() {
              final updates = nearbyCtrl.updates.toList();
              return _UpdatesTimeline(updates: updates);
            }),
          ),

          // ── Study materials ─────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Obx(() {
              final loading = matCtrl.loading.value;
              final materials = matCtrl.materials.toList();
              return _MaterialsSection(loading: loading, materials: materials);
            }),
          ),

          // ── Nearby centers ──────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Obx(() {
              final centers = nearbyCtrl.centers.toList();
              final loading = nearbyCtrl.loading.value;
              return _NearbyCentersSection(
                  centers: centers, loading: loading);
            }),
          ),

          // ── AI Chatbot banner ───────────────────────────────────────────
          const SliverToBoxAdapter(child: _AIChatBanner()),

          // ── SOS card ────────────────────────────────────────────────────
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 0, 16, 32),
              child: _SosCard(),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Premium header ─────────────────────────────────────────────────────────────

class _PremiumHeader extends StatelessWidget {
  const _PremiumHeader({required this.name});
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
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.navy, Color(0xFF1E3A5F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$_greeting,',
                          style: const TextStyle(
                              color: Colors.white60, fontSize: 13),
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
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.calendar_today_rounded,
                                size: 11, color: Colors.white38),
                            const SizedBox(width: 4),
                            Text(
                              DateFormat('EEEE, d MMM yyyy')
                                  .format(DateTime.now()),
                              style: const TextStyle(
                                  color: Colors.white54, fontSize: 11),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  // Notification bell
                  GestureDetector(
                    onTap: () => Get.toNamed(AppRoutes.notifications),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          const Icon(Icons.notifications_rounded,
                              color: Colors.white, size: 22),
                          Positioned(
                            top: -2,
                            right: -2,
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Child profile card ─────────────────────────────────────────────────────────

class _ChildProfileCard extends StatelessWidget {
  const _ChildProfileCard({
    required this.loading,
    required this.children,
    required this.attendance,
    required this.attLoading,
  });

  final bool loading;
  final List<ChildSummary> children;
  final List<AttendanceDay> attendance;
  final bool attLoading;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (children.isEmpty) return const SizedBox.shrink();
    final child = children.first;
    final centerName = child.centers.isNotEmpty
        ? child.centers.first.centerName.replaceAll('SiraguWings ', '')
        : 'Unknown Center';

    // Compute age
    String age = '';
    if (child.dateOfBirth != null) {
      try {
        final dob = DateTime.parse(child.dateOfBirth!);
        final now = DateTime.now();
        age = '${now.year - dob.year} yrs';
      } catch (_) {}
    }

    // Attendance stats
    final present = attendance.where((a) => a.status == 'Present').length;
    final absent = attendance.where((a) => a.status == 'Absent').length;
    final late = attendance.where((a) => a.status == 'Late').length;
    final total = attendance.length;
    final pct = total > 0 ? (present / total * 100).round() : 0;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Top section: avatar + info + ring
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Avatar
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.3),
                        width: 2),
                  ),
                  child: ClipOval(
                    child: child.profileImageUrl != null
                        ? CachedNetworkImage(
                            imageUrl: child.profileImageUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) =>
                                const _InitialsAvatar(name: ''),
                            errorWidget: (_, __, ___) =>
                                _InitialsAvatar(name: child.name),
                          )
                        : _InitialsAvatar(name: child.name),
                  ),
                ),
                const SizedBox(width: 14),
                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        child.name,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          const Icon(Icons.business_rounded,
                              size: 12, color: AppColors.textSecondary),
                          const SizedBox(width: 4),
                          Text(
                            centerName,
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      if (attendance.isNotEmpty)
                        Text(
                          attendance.first.batchName,
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.textSecondary),
                        ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          if (age.isNotEmpty)
                            _Badge(age, AppColors.navy),
                          const SizedBox(width: 6),
                          if (child.gender != null)
                            _Badge(child.gender!, AppColors.accent),
                          const SizedBox(width: 6),
                          _Badge(
                            child.centers.isNotEmpty
                                ? child.centers.first.status
                                : 'Active',
                            AppColors.approved,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Attendance ring
                if (!attLoading && total > 0)
                  SizedBox(
                    width: 72,
                    height: 72,
                    child: CustomPaint(
                      painter: _AttendanceRingPainter(
                        percentage: present / total,
                        color: pct >= 80
                            ? AppColors.approved
                            : pct >= 60
                                ? AppColors.pending
                                : AppColors.rejected,
                      ),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '$pct%',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: pct >= 80
                                    ? AppColors.approved
                                    : pct >= 60
                                        ? AppColors.pending
                                        : AppColors.rejected,
                              ),
                            ),
                            const Text(
                              'Present',
                              style: TextStyle(
                                  fontSize: 9,
                                  color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                else if (attLoading)
                  const SizedBox(
                    width: 72,
                    height: 72,
                    child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                  ),
              ],
            ),
          ),
          // Stats row
          if (total > 0) ...[
            const Divider(height: 1, color: AppColors.border),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              child: Row(
                children: [
                  _StatItem('$present', 'Present', AppColors.approved),
                  _Divider(),
                  _StatItem('$absent', 'Absent', AppColors.rejected),
                  _Divider(),
                  _StatItem('$late', 'Late', AppColors.pending),
                  _Divider(),
                  _StatItem('$total', 'Total', AppColors.navy),
                ],
              ),
            ),
          ],
          // Last 12 attendance dots
          if (attendance.isNotEmpty) ...[
            const Divider(height: 1, color: AppColors.border),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'RECENT DAYS',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: attendance.take(12).map((a) {
                      final color = a.status == 'Present'
                          ? AppColors.approved
                          : a.status == 'Absent'
                              ? AppColors.rejected
                              : AppColors.pending;
                      return Expanded(
                        child: Tooltip(
                          message: '${a.attendanceDate}\n${a.status}',
                          child: Container(
                            margin: const EdgeInsets.symmetric(horizontal: 2),
                            height: 8,
                            decoration: BoxDecoration(
                              color: color,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _DotLegend(AppColors.approved, 'Present'),
                      const SizedBox(width: 12),
                      _DotLegend(AppColors.rejected, 'Absent'),
                      const SizedBox(width: 12),
                      _DotLegend(AppColors.pending, 'Late'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _AttendanceRingPainter extends CustomPainter {
  const _AttendanceRingPainter({required this.percentage, required this.color});
  final double percentage;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 5;
    final strokeWidth = 6.0;

    // Background ring
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = AppColors.border
        ..strokeWidth = strokeWidth
        ..style = PaintingStyle.stroke,
    );

    // Progress arc
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * percentage,
      false,
      Paint()
        ..color = color
        ..strokeWidth = strokeWidth
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _InitialsAvatar extends StatelessWidget {
  const _InitialsAvatar({required this.name});
  final String name;

  String get _initials {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    if (parts.isNotEmpty && parts[0].isNotEmpty) return parts[0][0].toUpperCase();
    return '?';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.primary.withValues(alpha: 0.15),
      child: Center(
        child: Text(
          _initials,
          style: const TextStyle(
            color: AppColors.primary,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge(this.label, this.color);
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
            color: color, fontSize: 10, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem(this.value, this.label, this.color);
  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
                fontSize: 18, fontWeight: FontWeight.bold, color: color),
          ),
          Text(
            label,
            style: const TextStyle(
                fontSize: 10, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
        width: 1, height: 32, color: AppColors.border);
  }
}

class _DotLegend extends StatelessWidget {
  const _DotLegend(this.color, this.label);
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label,
            style: const TextStyle(
                fontSize: 10, color: AppColors.textSecondary)),
      ],
    );
  }
}

// ── Quick stats row ────────────────────────────────────────────────────────────

class _QuickStats extends StatelessWidget {
  const _QuickStats({required this.attendance});
  final List<AttendanceDay> attendance;

  @override
  Widget build(BuildContext context) {
    // Streak: consecutive present days from latest
    int streak = 0;
    for (final a in attendance) {
      if (a.status == 'Present') {
        streak++;
      } else {
        break;
      }
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Row(
        children: [
          Expanded(
            child: _StatCard(
              icon: Icons.local_fire_department_rounded,
              iconColor: AppColors.primary,
              value: '$streak',
              label: 'Day Streak',
              bgColor: AppColors.primary.withValues(alpha: 0.08),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _StatCard(
              icon: Icons.schedule_rounded,
              iconColor: AppColors.navy,
              value: 'Wed 5PM',
              label: 'Next Class',
              bgColor: AppColors.navy.withValues(alpha: 0.06),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: GestureDetector(
              onTap: () => Get.toNamed(AppRoutes.parentFees),
              child: _StatCard(
                icon: Icons.receipt_long_rounded,
                iconColor: AppColors.pending,
                value: '₹2,500',
                label: 'Fee Due',
                bgColor: AppColors.pending.withValues(alpha: 0.08),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.iconColor,
    required this.value,
    required this.label,
    required this.bgColor,
  });

  final IconData icon;
  final Color iconColor;
  final String value;
  final String label;
  final Color bgColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: iconColor.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor, size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: iconColor,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
                fontSize: 10, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

// ── Updates timeline ───────────────────────────────────────────────────────────

class _UpdatesTimeline extends StatelessWidget {
  const _UpdatesTimeline({required this.updates});
  final List<ParentUpdate> updates;

  @override
  Widget build(BuildContext context) {
    if (updates.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'UPDATES & SCHEDULE',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                  letterSpacing: 0.8,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () => Get.toNamed(AppRoutes.notifications),
                child: const Text(
                  'See all',
                  style: TextStyle(
                      fontSize: 12,
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: updates.asMap().entries.map((e) {
                final isLast = e.key == updates.length - 1;
                return _TimelineTile(
                    update: e.value, isLast: isLast);
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimelineTile extends StatelessWidget {
  const _TimelineTile({required this.update, required this.isLast});
  final ParentUpdate update;
  final bool isLast;

  IconData get _icon {
    switch (update.type) {
      case 'homework':
        return Icons.assignment_rounded;
      case 'exam':
        return Icons.school_rounded;
      case 'announcement':
        return Icons.campaign_rounded;
      case 'material':
        return Icons.play_circle_rounded;
      case 'fee':
        return Icons.receipt_long_rounded;
      default:
        return Icons.info_rounded;
    }
  }

  Color get _color {
    switch (update.type) {
      case 'homework':
        return AppColors.accent;
      case 'exam':
        return AppColors.primary;
      case 'announcement':
        return AppColors.navy;
      case 'material':
        return const Color(0xFF8B5CF6);
      case 'fee':
        return AppColors.pending;
      default:
        return AppColors.textSecondary;
    }
  }

  String get _dueLabel {
    if (update.dueDate == null) return '';
    try {
      final dt = DateTime.parse(update.dueDate!);
      final diff = dt.difference(DateTime.now()).inDays;
      if (diff == 0) return 'Today';
      if (diff == 1) return 'Tomorrow';
      if (diff < 0) return 'Overdue';
      return DateFormat('d MMM').format(dt);
    } catch (_) {
      return update.dueDate!;
    }
  }

  bool get _isUrgent {
    if (update.dueDate == null) return false;
    try {
      final dt = DateTime.parse(update.dueDate!);
      return dt.difference(DateTime.now()).inDays <= 2;
    } catch (_) {
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _color;
    final dueLabel = _dueLabel;
    final route = update.type == 'material'
        ? AppRoutes.materials
        : update.type == 'fee'
            ? AppRoutes.parentFees
            : null;
    return Column(
      children: [
        InkWell(
          onTap: route != null ? () => Get.toNamed(route) : null,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(_icon, color: color, size: 16),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        update.title,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        update.subtitle,
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textSecondary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (dueLabel.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: (_isUrgent ? AppColors.rejected : color)
                          .withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      dueLabel,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: _isUrgent ? AppColors.rejected : color,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        if (!isLast) const Divider(height: 1, indent: 52, endIndent: 16),
      ],
    );
  }
}

// ── Study materials section ────────────────────────────────────────────────────

class _MaterialsSection extends StatelessWidget {
  const _MaterialsSection({required this.loading, required this.materials});
  final bool loading;
  final List<CourseMaterial> materials;

  IconData _icon(String type) {
    switch (type) {
      case 'assignment':
        return Icons.assignment_rounded;
      case 'note':
        return Icons.sticky_note_2_rounded;
      default:
        return Icons.picture_as_pdf_rounded;
    }
  }

  Color _color(String type) {
    switch (type) {
      case 'assignment':
        return AppColors.pending;
      case 'note':
        return AppColors.accent;
      default:
        return AppColors.rejected;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!loading && materials.isEmpty) return const SizedBox.shrink();

    final recent = materials.take(3).toList();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'STUDY MATERIALS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                  letterSpacing: 0.8,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () => Get.toNamed(AppRoutes.materials),
                child: const Text(
                  'View all',
                  style: TextStyle(
                      fontSize: 12,
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (loading)
            const Center(child: CircularProgressIndicator())
          else
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: recent.asMap().entries.map((e) {
                  final mat = e.value;
                  final isLast = e.key == recent.length - 1;
                  final color = _color(mat.type);
                  final isDueNear = mat.dueDate != null &&
                      DateTime.parse(mat.dueDate!)
                              .difference(DateTime.now())
                              .inDays <=
                          7;
                  return Column(
                    children: [
                      ListTile(
                        onTap: () => Get.toNamed(AppRoutes.materials),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        leading: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(_icon(mat.type), color: color, size: 20),
                        ),
                        title: Text(
                          mat.title,
                          style: const TextStyle(
                              fontSize: 13, fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 2),
                            Text(
                              mat.description,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary
                                        .withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    mat.batchName,
                                    style: const TextStyle(
                                        fontSize: 10,
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.w500),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'by ${mat.uploadedBy}',
                                  style: const TextStyle(
                                      fontSize: 10,
                                      color: AppColors.textSecondary),
                                ),
                                if (mat.dueDate != null) ...[
                                  const SizedBox(width: 6),
                                  Icon(Icons.schedule_rounded,
                                      size: 10,
                                      color: isDueNear
                                          ? AppColors.pending
                                          : AppColors.textSecondary),
                                  const SizedBox(width: 2),
                                  Text(
                                    'Due ${DateFormat('d MMM').format(DateTime.parse(mat.dueDate!))}',
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: isDueNear
                                          ? AppColors.pending
                                          : AppColors.textSecondary,
                                      fontWeight: isDueNear
                                          ? FontWeight.w600
                                          : FontWeight.normal,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.download_rounded,
                              size: 18, color: AppColors.primary),
                          onPressed: () => Get.snackbar(
                            'Download',
                            '${mat.fileName ?? mat.title} will be available once connected.',
                            snackPosition: SnackPosition.BOTTOM,
                          ),
                        ),
                      ),
                      if (!isLast)
                        const Divider(height: 1, indent: 56, endIndent: 16),
                    ],
                  );
                }).toList(),
              ),
            ),
          if (materials.length > 3)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: GestureDetector(
                onTap: () => Get.toNamed(AppRoutes.materials),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.folder_open_rounded,
                          size: 16, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Text(
                        'View all ${materials.length} materials',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Nearby centers section ─────────────────────────────────────────────────────

class _NearbyCentersSection extends StatelessWidget {
  const _NearbyCentersSection(
      {required this.centers, required this.loading});
  final List<NearbyCenter> centers;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 20, 0, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                const Text(
                  'NEARBY CENTERS',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary,
                    letterSpacing: 0.8,
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () => Get.toNamed(AppRoutes.nearbyCenters),
                  child: const Text(
                    'View all',
                    style: TextStyle(
                        fontSize: 12,
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (loading)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            SizedBox(
              height: 188,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: centers.length,
                itemBuilder: (_, i) => _NearbyCenterCard(centers[i]),
              ),
            ),
        ],
      ),
    );
  }
}

class _NearbyCenterCard extends StatelessWidget {
  const _NearbyCenterCard(this.center);
  final NearbyCenter center;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Get.toNamed(AppRoutes.nearbyCenters),
      child: Container(
        width: 200,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: Stack(
                children: [
                  SizedBox(
                    height: 100,
                    width: double.infinity,
                    child: center.photoUrl != null
                        ? Image.network(
                            center.photoUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              color: AppColors.navy.withValues(alpha: 0.08),
                              child: const Center(
                                child: Icon(Icons.business_rounded,
                                    size: 32,
                                    color: AppColors.textSecondary),
                              ),
                            ),
                          )
                        : Container(
                            color: AppColors.navy.withValues(alpha: 0.08),
                            child: const Center(
                              child: Icon(Icons.business_rounded,
                                  size: 32,
                                  color: AppColors.textSecondary),
                            ),
                          ),
                  ),
                  if (center.isEnrolled)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.approved,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          'Enrolled',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '${center.distanceKm} km',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    center.name.replaceAll('SiraguWings ', ''),
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded,
                          color: Color(0xFFF59E0B), size: 13),
                      const SizedBox(width: 2),
                      Text(
                        '${center.rating}  •  ${center.courses.length} courses',
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textSecondary),
                      ),
                    ],
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

// ── AI Chat banner ─────────────────────────────────────────────────────────────

class _AIChatBanner extends StatelessWidget {
  const _AIChatBanner();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Get.toNamed(AppRoutes.parentChatbot),
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 20, 16, 0),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF6366F1).withValues(alpha: 0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.smart_toy_rounded,
                  color: Colors.white, size: 24),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'AI Assistant',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Ask about attendance, fees, schedule & more',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                'Chat',
                style: TextStyle(
                  color: Color(0xFF6366F1),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── SOS card ──────────────────────────────────────────────────────────────────

class _SosCard extends StatelessWidget {
  const _SosCard();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Get.toNamed(AppRoutes.sos),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.rejected.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.rejected.withValues(alpha: 0.2)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.rejected.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.sos_rounded,
                  color: AppColors.rejected, size: 22),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Emergency SOS',
                    style: TextStyle(
                      color: AppColors.rejected,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    'Tap to send emergency alert to center',
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 12),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right,
                color: AppColors.rejected, size: 20),
          ],
        ),
      ),
    );
  }
}
