import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../config/routes/app_routes.dart';
import '../../../config/themes/app_theme.dart';
import '../../auth/controller/auth_controller.dart';
import '../../teacher/batches/controller/teacher_batch_controller.dart';
import '../../teacher/batches/model/teacher_batch_model.dart';
import '../../teacher/batches/ui/attendance_screen.dart';
import '../../teacher/checkin/controller/checkin_controller.dart';
import '../../teacher/checkin/model/checkin_model.dart';

class TeacherHomeTab extends StatelessWidget {
  const TeacherHomeTab({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Get.find<AuthController>();
    final ctrl = Get.find<TeacherBatchController>();
    final checkIn = Get.find<CheckInController>();

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async {
        await Future.wait([ctrl.loadAll(), checkIn.loadHistory()]);
      },
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: _TeacherHeader(auth: auth),
          ),
          SliverToBoxAdapter(
            child: Obx(() {
              final today = checkIn.todayRecord.value;
              final isCheckedIn = today != null && today.isPresent;
              return _CheckInBanner(today: today, isCheckedIn: isCheckedIn);
            }),
          ),
          SliverToBoxAdapter(
            child: Obx(() => _StatsRow(stats: ctrl.stats.value)),
          ),
          SliverToBoxAdapter(
            child: const Padding(
              padding: EdgeInsets.fromLTRB(16, 20, 16, 0),
              child: _QuickActions(),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
              child: Obx(() {
                final loading = ctrl.loading.value;
                final batches = ctrl.batches.toList();
                return _TodayBatches(loading: loading, batches: batches, ctrl: ctrl);
              }),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
              child: Obx(() {
                final loading = ctrl.loading.value;
                final batches = ctrl.batches.toList();
                return _AllBatchesMini(loading: loading, batches: batches, ctrl: ctrl);
              }),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 40)),
        ],
      ),
    );
  }
}





// ── Header ───────────────────────────────────────────────────────────────────

class _TeacherHeader extends StatelessWidget {
  const _TeacherHeader({required this.auth});
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
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
      decoration: const BoxDecoration(
        color: AppColors.navy,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
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
                      auth.profile.value?.name ?? 'Teacher',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
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
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.school_rounded, color: Colors.white70, size: 13),
                SizedBox(width: 5),
                Text(
                  'Teacher',
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

// ── Check-in banner ──────────────────────────────────────────────────────────

class _CheckInBanner extends StatelessWidget {
  const _CheckInBanner({required this.today, required this.isCheckedIn});
  final CheckInRecord? today;
  final bool isCheckedIn;

  @override
  Widget build(BuildContext context) {

    return GestureDetector(
      onTap: () => Get.toNamed(AppRoutes.teacherCheckIn),
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isCheckedIn
              ? AppColors.approved.withValues(alpha: 0.1)
              : AppColors.primary.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isCheckedIn
                ? AppColors.approved.withValues(alpha: 0.4)
                : AppColors.primary.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          children: [
            Icon(
              isCheckedIn
                  ? Icons.check_circle_rounded
                  : Icons.qr_code_scanner_rounded,
              color: isCheckedIn ? AppColors.approved : AppColors.primary,
              size: 22,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isCheckedIn ? 'Checked In Today' : 'Not Checked In',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isCheckedIn
                          ? AppColors.approved
                          : AppColors.primary,
                    ),
                  ),
                  Text(
                    isCheckedIn
                        ? 'At ${today!.centerName}  ·  ${today!.checkInTime}'
                        : 'Tap to scan center QR and check in',
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right,
                size: 18, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }
}

// ── Stats row ────────────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.stats});
  final TeacherStats? stats;

  @override
  Widget build(BuildContext context) {
    if (stats == null) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.8,
        children: [
          _StatCard(
            label: 'My Students',
            value: '${stats!.totalStudents}',
            icon: Icons.people_rounded,
            iconColor: AppColors.primary,
          ),
          _StatCard(
            label: 'Batches',
            value: '${stats!.totalBatches}',
            icon: Icons.class_rounded,
            iconColor: AppColors.accent,
          ),
          _StatCard(
            label: 'Attendance %',
            value: '${stats!.attendanceThisWeekPct}%',
            icon: Icons.fact_check_rounded,
            iconColor: AppColors.approved,
          ),
          _StatCard(
            label: 'Classes/Month',
            value: '${stats!.classesThisMonth}',
            icon: Icons.calendar_month_rounded,
            iconColor: AppColors.navy,
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.iconColor,
  });
  final String label;
  final String value;
  final IconData icon;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(value,
                    style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary)),
                Text(label,
                    style: const TextStyle(
                        fontSize: 10, color: AppColors.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Quick actions ────────────────────────────────────────────────────────────

class _QuickActions extends StatelessWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context) {
    final actions = [
      _QA('My Batches', Icons.class_rounded, AppColors.primary,
          AppRoutes.teacherBatches),
      _QA('Attendance', Icons.fact_check_rounded, AppColors.approved,
          AppRoutes.teacherBatches),
      _QA('Check In', Icons.qr_code_scanner_rounded, AppColors.accent,
          AppRoutes.teacherCheckIn),
      _QA('Alerts', Icons.notifications_rounded, AppColors.navy,
          AppRoutes.notifications),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Quick Actions',
            style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary)),
        const SizedBox(height: 12),
        Row(
          children: actions.map((a) {
            return Expanded(
              child: Padding(
                padding:
                    EdgeInsets.only(right: a == actions.last ? 0 : 10),
                child: GestureDetector(
                  onTap: () {
                    if (a.route != null) Get.toNamed(a.route!);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: a.color.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(14),
                      border:
                          Border.all(color: a.color.withValues(alpha: 0.2)),
                    ),
                    child: Column(
                      children: [
                        Icon(a.icon, color: a.color, size: 22),
                        const SizedBox(height: 6),
                        Text(a.label,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: a.color,
                            )),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _QA {
  const _QA(this.label, this.icon, this.color, this.route);
  final String label;
  final IconData icon;
  final Color color;
  final String? route;
}

// ── Today's batches ──────────────────────────────────────────────────────────

class _TodayBatches extends StatelessWidget {
  const _TodayBatches({
    required this.loading,
    required this.batches,
    required this.ctrl,
  });
  final bool loading;
  final List<TeacherBatch> batches;
  final TeacherBatchController ctrl;

  static const _dayAbbr = {
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
    7: 'Sun',
  };

  bool _isTodaysBatch(TeacherBatch b) {
    final todayAbbr = _dayAbbr[DateTime.now().weekday] ?? '';
    return b.classDays.contains(todayAbbr);
  }

  @override
  Widget build(BuildContext context) {
    if (ctrl.loading.value) return const SizedBox.shrink();
    final todayBatches = ctrl.batches.where(_isTodaysBatch).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text("Today's Classes",
                style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary)),
            const Spacer(),
            if (todayBatches.isEmpty)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text('No classes today',
                    style: TextStyle(
                        fontSize: 10, color: AppColors.textSecondary)),
              )
            else
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('${todayBatches.length} class(es)',
                    style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600)),
              ),
          ],
        ),
        if (todayBatches.isNotEmpty) ...[
          const SizedBox(height: 12),
          ...todayBatches.map((b) => _TodayBatchTile(batch: b, ctrl: ctrl)),
        ] else
          const SizedBox(height: 4),
      ],
    );
  }
}

class _TodayBatchTile extends StatelessWidget {
  const _TodayBatchTile({required this.batch, required this.ctrl});
  final TeacherBatch batch;
  final TeacherBatchController ctrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.primary.withValues(alpha: 0.7)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          const Icon(Icons.class_rounded, color: Colors.white, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(batch.batchName,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14)),
                Text(
                  '${batch.startTime} – ${batch.endTime}  ·  ${batch.studentCount} students',
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              await ctrl.openAttendance(batch);
              Get.to(() => const AttendanceScreen());
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppColors.primary,
              minimumSize: Size.zero,
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Attend',
                style:
                    TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}

// ── All batches mini list ────────────────────────────────────────────────────

class _AllBatchesMini extends StatelessWidget {
  const _AllBatchesMini({
    required this.loading,
    required this.batches,
    required this.ctrl,
  });
  final bool loading;
  final List<TeacherBatch> batches;
  final TeacherBatchController ctrl;

  @override
  Widget build(BuildContext context) {
    if (loading || batches.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text('All Batches',
                style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary)),
            const Spacer(),
            GestureDetector(
              onTap: () => Get.toNamed(AppRoutes.teacherBatches),
              child: const Text('See all',
                  style: TextStyle(
                      fontSize: 12,
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600)),
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
            children: ctrl.batches.asMap().entries.map((entry) {
              final i = entry.key;
              final b = entry.value;
              final isLast = i == ctrl.batches.length - 1;
              return Column(
                children: [
                  ListTile(
                    onTap: () async {
                      await ctrl.openAttendance(b);
                      Get.to(() => const AttendanceScreen());
                    },
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 4),
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.class_rounded,
                          color: AppColors.primary, size: 18),
                    ),
                    title: Text(b.batchName,
                        style: const TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      '${b.classDays}  ·  ${b.startTime}–${b.endTime}',
                      style: const TextStyle(
                          fontSize: 11, color: AppColors.textSecondary),
                    ),
                    trailing: Text(
                      '${b.studentCount} stu.',
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.textSecondary),
                    ),
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
