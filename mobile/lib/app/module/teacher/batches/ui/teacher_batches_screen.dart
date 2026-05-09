import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../config/themes/app_theme.dart';
import '../controller/teacher_batch_controller.dart';
import '../model/teacher_batch_model.dart';
import 'attendance_screen.dart';

class TeacherBatchesScreen extends StatelessWidget {
  const TeacherBatchesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<TeacherBatchController>();
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Obx(() {
        if (ctrl.loading.value) {
          return const Center(child: CircularProgressIndicator());
        }
        if (ctrl.batches.isEmpty) {
          return const Center(
            child: Text('No batches assigned.',
                style: TextStyle(color: AppColors.textSecondary)),
          );
        }
        return RefreshIndicator(
          color: AppColors.primary,
          onRefresh: ctrl.loadBatches,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
                  color: AppColors.navy,
                  child: const Text(
                    'My Batches',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (_, i) => _BatchCard(ctrl.batches[i], ctrl),
                    childCount: ctrl.batches.length,
                  ),
                ),
              ),
            ],
          ),
        );
      }),
    );
  }
}

class _BatchCard extends StatelessWidget {
  const _BatchCard(this.batch, this.ctrl);
  final TeacherBatch batch;
  final TeacherBatchController ctrl;

  Color get _categoryColor {
    switch (batch.categoryType?.toLowerCase()) {
      case 'sports':
        return AppColors.primary;
      case 'dance':
        return const Color(0xFF8B5CF6);
      case 'music':
        return const Color(0xFF06B6D4);
      default:
        return AppColors.accent;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _categoryColor;
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.06),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(18)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.class_rounded, color: color, size: 18),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        batch.batchName,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      Text(
                        batch.courseName,
                        style: TextStyle(
                            fontSize: 12, color: color.withValues(alpha: 0.8)),
                      ),
                    ],
                  ),
                ),
                if (batch.categoryType != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      batch.categoryType!,
                      style: TextStyle(
                          color: color,
                          fontSize: 11,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
              ],
            ),
          ),
          // Info rows
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                _InfoRow(
                    Icons.schedule_rounded,
                    '${batch.startTime} – ${batch.endTime}',
                    AppColors.textSecondary),
                const SizedBox(height: 6),
                _InfoRow(Icons.calendar_month_rounded, batch.classDays,
                    AppColors.textSecondary),
                const SizedBox(height: 6),
                _InfoRow(Icons.people_rounded,
                    '${batch.studentCount} students', AppColors.textSecondary),
                if (batch.attendanceThisWeek > 0) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Text('Attendance this week',
                          style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary)),
                      const Spacer(),
                      Text(
                        '${batch.attendanceThisWeek}%',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: batch.attendanceThisWeek >= 80
                              ? AppColors.approved
                              : AppColors.pending,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: batch.attendanceThisWeek / 100,
                      backgroundColor: AppColors.border,
                      color: batch.attendanceThisWeek >= 80
                          ? AppColors.approved
                          : AppColors.pending,
                      minHeight: 5,
                    ),
                  ),
                ],
              ],
            ),
          ),
          // Action bar
          Container(
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.border)),
              borderRadius:
                  BorderRadius.vertical(bottom: Radius.circular(18)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextButton.icon(
                    onPressed: () async {
                      await ctrl.openAttendance(batch);
                      Get.to(() => const AttendanceScreen());
                    },
                    icon: const Icon(Icons.fact_check_rounded, size: 16),
                    label: const Text('Take Attendance',
                        style: TextStyle(fontSize: 13)),
                    style: TextButton.styleFrom(
                      foregroundColor: color,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                Container(
                    width: 1, height: 32, color: AppColors.border),
                Expanded(
                  child: TextButton.icon(
                    onPressed: () async {
                      await ctrl.openAttendance(batch);
                      Get.to(() => _QrDisplayPage(batch: batch));
                    },
                    icon: const Icon(Icons.qr_code_rounded, size: 16),
                    label: const Text('Show QR',
                        style: TextStyle(fontSize: 13)),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.navy,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
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

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.icon, this.text, this.color);
  final IconData icon;
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 6),
        Text(text, style: TextStyle(fontSize: 12, color: color)),
      ],
    );
  }
}

// ── QR display page (students show this to be scanned) ───────────────────────

class _QrDisplayPage extends StatelessWidget {
  const _QrDisplayPage({required this.batch});
  final TeacherBatch batch;

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<TeacherBatchController>();
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        title: Text('${batch.batchName} — Student QRs',
            style: const TextStyle(color: Colors.white, fontSize: 15)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Obx(() {
        if (ctrl.attendanceLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: ctrl.students.length,
          itemBuilder: (_, i) {
            final s = ctrl.students[i];
            final qrData = 'SW:${s.studentId}';
            return Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 22,
                    backgroundColor:
                        AppColors.primary.withValues(alpha: 0.1),
                    backgroundImage: s.profileImageUrl != null
                        ? NetworkImage(s.profileImageUrl!)
                        : null,
                    child: s.profileImageUrl == null
                        ? Text(
                            s.name.isNotEmpty
                                ? s.name[0].toUpperCase()
                                : '?',
                            style: const TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold),
                          )
                        : null,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(s.name,
                            style: const TextStyle(
                                fontWeight: FontWeight.w600)),
                        Text(qrData,
                            style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textSecondary,
                                fontFamily: 'monospace')),
                      ],
                    ),
                  ),
                  // Visual QR placeholder (real QR needs qr_flutter package)
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: AppColors.navy.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.navy, width: 1.5),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.qr_code_rounded,
                            size: 28, color: AppColors.navy),
                        Text(
                          s.studentId,
                          style: const TextStyle(
                              fontSize: 7, color: AppColors.navy),
                          textAlign: TextAlign.center,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      }),
    );
  }
}
