import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../config/themes/app_theme.dart';
import '../controller/teacher_batch_controller.dart';
import '../model/teacher_batch_model.dart';

class AttendanceScreen extends StatelessWidget {
  const AttendanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<TeacherBatchController>();
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        title: Obx(() => Text(
              ctrl.selectedBatch.value?.batchName ?? 'Attendance',
              style: const TextStyle(color: Colors.white),
            )),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          TextButton(
            onPressed: () => ctrl.setAll('Present'),
            child: const Text('All Present',
                style: TextStyle(color: Colors.white70, fontSize: 12)),
          ),
          TextButton(
            onPressed: () => ctrl.setAll('Absent'),
            child: const Text('All Absent',
                style: TextStyle(color: Colors.white54, fontSize: 12)),
          ),
        ],
      ),
      body: Obx(() {
        if (ctrl.attendanceLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }
        if (ctrl.students.isEmpty) {
          return const Center(
            child: Text('No students in this batch.',
                style: TextStyle(color: AppColors.textSecondary)),
          );
        }
        return Column(
          children: [
            _AttendanceSummaryBar(ctrl: ctrl),
            _DateGeoBar(ctrl: ctrl),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                itemCount: ctrl.students.length,
                itemBuilder: (_, i) => Obx(
                  () => _StudentTile(
                    student: ctrl.students[i],
                    onToggle: () => ctrl.toggleStatus(i),
                  ),
                ),
              ),
            ),
          ],
        );
      }),
      floatingActionButton: Obx(() => FloatingActionButton.extended(
            heroTag: 'save_att',
            backgroundColor: AppColors.primary,
            onPressed: ctrl.saving.value ? null : ctrl.saveAttendance,
            icon: ctrl.saving.value
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.save_rounded, color: Colors.white),
            label: Text(
              ctrl.saving.value ? 'Saving…' : 'Save Attendance',
              style: const TextStyle(color: Colors.white),
            ),
          )),
    );
  }
}

// ── Summary bar ──────────────────────────────────────────────────────────────

class _AttendanceSummaryBar extends StatelessWidget {
  const _AttendanceSummaryBar({required this.ctrl});
  final TeacherBatchController ctrl;

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final total = ctrl.students.length;
      final present = ctrl.presentCount;
      final absent = ctrl.absentCount;
      final unmarked = ctrl.unmarkedCount;
      return Container(
        color: AppColors.navy,
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Row(
          children: [
            _SummaryChip(
                label: 'Present', count: present, color: AppColors.approved),
            const SizedBox(width: 8),
            _SummaryChip(
                label: 'Absent', count: absent, color: AppColors.rejected),
            const SizedBox(width: 8),
            _SummaryChip(
                label: 'Unmarked', count: unmarked, color: Colors.white38),
            const Spacer(),
            Text(
              '$total Students',
              style: const TextStyle(color: Colors.white54, fontSize: 12),
            ),
          ],
        ),
      );
    });
  }
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip(
      {required this.label, required this.count, required this.color});
  final String label;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$count',
            style: TextStyle(
                color: color, fontWeight: FontWeight.bold, fontSize: 13),
          ),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(color: color, fontSize: 11)),
        ],
      ),
    );
  }
}

// ── Date + Geo bar ────────────────────────────────────────────────────────────

class _DateGeoBar extends StatelessWidget {
  const _DateGeoBar({required this.ctrl});
  final TeacherBatchController ctrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          const Icon(Icons.calendar_today_rounded,
              size: 14, color: AppColors.textSecondary),
          const SizedBox(width: 6),
          Text(
            ctrl.attendanceDate,
            style: const TextStyle(
                fontSize: 13, color: AppColors.textSecondary),
          ),
          const Spacer(),
          Obx(() {
            final pos = ctrl.capturedPosition.value;
            final loading = ctrl.geoLoading.value;
            if (loading) {
              return const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2),
              );
            }
            if (pos != null) {
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.location_on_rounded,
                      size: 14, color: AppColors.approved),
                  const SizedBox(width: 4),
                  Text(
                    '${pos.latitude.toStringAsFixed(3)}, ${pos.longitude.toStringAsFixed(3)}',
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.approved),
                  ),
                ],
              );
            }
            return GestureDetector(
              onTap: ctrl.captureLocation,
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.my_location_rounded,
                      size: 14, color: AppColors.primary),
                  SizedBox(width: 4),
                  Text('Capture Location',
                      style: TextStyle(
                          fontSize: 11,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600)),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

// ── Student tile ─────────────────────────────────────────────────────────────

class _StudentTile extends StatelessWidget {
  const _StudentTile({required this.student, required this.onToggle});
  final AttendanceStudent student;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final status = student.status;
    Color statusColor;
    String statusLabel;
    IconData statusIcon;
    switch (status) {
      case 'Present':
        statusColor = AppColors.approved;
        statusLabel = 'Present';
        statusIcon = Icons.check_circle_rounded;
      case 'Absent':
        statusColor = AppColors.rejected;
        statusLabel = 'Absent';
        statusIcon = Icons.cancel_rounded;
      default:
        statusColor = AppColors.border;
        statusLabel = 'Tap';
        statusIcon = Icons.radio_button_unchecked_rounded;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: status != null
              ? statusColor.withValues(alpha: 0.4)
              : AppColors.border,
        ),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        leading: CircleAvatar(
          radius: 20,
          backgroundColor: AppColors.primary.withValues(alpha: 0.1),
          backgroundImage: student.profileImageUrl != null
              ? NetworkImage(student.profileImageUrl!)
              : null,
          child: student.profileImageUrl == null
              ? Text(
                  student.name.isNotEmpty ? student.name[0].toUpperCase() : '?',
                  style: const TextStyle(
                      color: AppColors.primary, fontWeight: FontWeight.bold),
                )
              : null,
        ),
        title: Text(
          student.name,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        subtitle: Text(
          student.studentId,
          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
        ),
        trailing: GestureDetector(
          onTap: onToggle,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: status != null
                  ? statusColor.withValues(alpha: 0.12)
                  : AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: statusColor),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(statusIcon, color: statusColor, size: 16),
                const SizedBox(width: 4),
                Text(
                  statusLabel,
                  style: TextStyle(
                    color: statusColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

