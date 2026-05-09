import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../../config/themes/app_theme.dart';
import '../controller/attendance_controller.dart';
import '../model/attendance_overview_row.dart';

class OwnerAttendanceScreen extends StatelessWidget {
  const OwnerAttendanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.put(AttendanceController());

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Attendance Overview'),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
      ),
      body: Obx(() {
        if (ctrl.loading.value) {
          return const Center(
              child: CircularProgressIndicator(color: AppColors.primary));
        }
        return Column(
          children: [
            _DateHeader(ctrl: ctrl),
            Expanded(
              child: ctrl.forSelectedDate.isEmpty
                  ? const Center(
                      child: Text('No attendance data for this date'))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: ctrl.forSelectedDate.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) =>
                          _AttendanceCard(row: ctrl.forSelectedDate[i]),
                    ),
            ),
          ],
        );
      }),
    );
  }
}

class _DateHeader extends StatelessWidget {
  const _DateHeader({required this.ctrl});
  final AttendanceController ctrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Row(
        children: [
          const Icon(Icons.calendar_month_rounded,
              color: AppColors.primary, size: 20),
          const SizedBox(width: 10),
          Obx(() => Text(
                DateFormat('EEEE, d MMM yyyy').format(ctrl.selectedDate.value),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              )),
          const Spacer(),
          TextButton(
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: ctrl.selectedDate.value,
                firstDate: DateTime(2024),
                lastDate: DateTime.now(),
                builder: (ctx, child) => Theme(
                  data: Theme.of(ctx).copyWith(
                    colorScheme: const ColorScheme.light(
                      primary: AppColors.primary,
                    ),
                  ),
                  child: child!,
                ),
              );
              if (picked != null) ctrl.setDate(picked);
            },
            child: const Text('Change',
                style: TextStyle(color: AppColors.primary)),
          ),
        ],
      ),
    );
  }
}

class _AttendanceCard extends StatelessWidget {
  const _AttendanceCard({required this.row});
  final AttendanceOverviewRow row;

  @override
  Widget build(BuildContext context) {
    final pct = row.presentPct;
    final color = pct >= 80
        ? AppColors.approved
        : pct >= 60
            ? AppColors.pending
            : AppColors.rejected;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  row.batchName,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              Text(
                '${pct.toStringAsFixed(0)}%',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct / 100,
              backgroundColor: AppColors.border,
              valueColor: AlwaysStoppedAnimation(color),
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _CountBadge(
                  label: 'Present',
                  count: row.presentCount,
                  color: AppColors.approved),
              const SizedBox(width: 10),
              _CountBadge(
                  label: 'Absent',
                  count: row.absentCount,
                  color: AppColors.rejected),
              const SizedBox(width: 10),
              _CountBadge(
                  label: 'Total',
                  count: row.totalStudents,
                  color: AppColors.textSecondary),
            ],
          ),
        ],
      ),
    );
  }
}

class _CountBadge extends StatelessWidget {
  const _CountBadge(
      {required this.label, required this.count, required this.color});
  final String label;
  final int count;
  final Color color;

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
        Text('$count $label',
            style:
                TextStyle(fontSize: 11, color: color)),
      ],
    );
  }
}
