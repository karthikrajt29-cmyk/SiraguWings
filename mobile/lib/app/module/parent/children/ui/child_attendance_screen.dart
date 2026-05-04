import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../config/themes/app_theme.dart';
import '../controller/children_controller.dart';

class ChildAttendanceScreen extends StatelessWidget {
  const ChildAttendanceScreen({super.key});

  Color _statusColor(String status) {
    switch (status) {
      case 'Present': return AppColors.approved;
      case 'Absent': return AppColors.rejected;
      case 'Late': return AppColors.pending;
      default: return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<ChildrenController>();
    return Scaffold(
      appBar: AppBar(
        title: Obx(() => Text(
              ctrl.selectedChild.value?.name ?? 'Attendance',
            )),
      ),
      body: Obx(() {
        if (ctrl.attendanceLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }
        if (ctrl.attendance.isEmpty) {
          return const Center(
            child: Text('No attendance records found.',
                style: TextStyle(color: AppColors.textSecondary)),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: ctrl.attendance.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (_, i) {
            final a = ctrl.attendance[i];
            final color = _statusColor(a.status);
            return Card(
              child: ListTile(
                leading: Container(
                  width: 8,
                  height: 40,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                title: Text(a.batchName,
                    style: const TextStyle(fontWeight: FontWeight.w500)),
                subtitle: Text(
                  '${a.courseName ?? ''} · ${a.attendanceDate}',
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textSecondary),
                ),
                trailing: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: color),
                  ),
                  child: Text(
                    a.status,
                    style: TextStyle(
                        color: color,
                        fontSize: 11,
                        fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            );
          },
        );
      }),
    );
  }
}
