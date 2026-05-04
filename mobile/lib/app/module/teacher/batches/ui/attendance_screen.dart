import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../config/themes/app_theme.dart';
import '../controller/teacher_batch_controller.dart';

class AttendanceScreen extends StatelessWidget {
  const AttendanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<TeacherBatchController>();
    return Scaffold(
      appBar: AppBar(
        title: Obx(() => Text(ctrl.selectedBatch.value?.batchName ?? 'Attendance')),
        actions: [
          TextButton(
            onPressed: () => ctrl.setAll('Present'),
            child: const Text('All ✓', style: TextStyle(color: Colors.white)),
          ),
          TextButton(
            onPressed: () => ctrl.setAll('Absent'),
            child: const Text('All ✗', style: TextStyle(color: Colors.white70)),
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
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                'Date: ${ctrl.attendanceDate}',
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: ctrl.students.length,
                itemBuilder: (_, i) {
                  final s = ctrl.students[i];
                  return Obx(() {
                    final status = ctrl.students[i].status;
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                          child: Text(
                            s.name.isNotEmpty ? s.name[0].toUpperCase() : '?',
                            style: const TextStyle(color: AppColors.primary),
                          ),
                        ),
                        title: Text(s.name),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _StatusToggle(
                              label: 'P',
                              active: status == 'Present',
                              color: AppColors.approved,
                              onTap: () {
                                ctrl.students[i].status = 'Present';
                                ctrl.students.refresh();
                              },
                            ),
                            const SizedBox(width: 8),
                            _StatusToggle(
                              label: 'A',
                              active: status == 'Absent',
                              color: AppColors.rejected,
                              onTap: () {
                                ctrl.students[i].status = 'Absent';
                                ctrl.students.refresh();
                              },
                            ),
                          ],
                        ),
                      ),
                    );
                  });
                },
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Obx(() => ElevatedButton(
                      onPressed: ctrl.saving.value ? null : ctrl.saveAttendance,
                      child: ctrl.saving.value
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('Save Attendance'),
                    )),
              ),
            ),
          ],
        );
      }),
    );
  }
}

class _StatusToggle extends StatelessWidget {
  const _StatusToggle({
    required this.label,
    required this.active,
    required this.color,
    required this.onTap,
  });

  final String label;
  final bool active;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: active ? color : color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            color: active ? Colors.white : color,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
