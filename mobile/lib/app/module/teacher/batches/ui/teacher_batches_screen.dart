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
      appBar: AppBar(title: const Text('My Batches')),
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
          onRefresh: ctrl.loadBatches,
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: ctrl.batches.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) => _BatchCard(ctrl.batches[i]),
          ),
        );
      }),
    );
  }
}

class _BatchCard extends StatelessWidget {
  const _BatchCard(this.batch);
  final TeacherBatch batch;

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<TeacherBatchController>();
    return Card(
      child: ListTile(
        onTap: () {
          ctrl.openAttendance(batch);
          Get.to(() => const AttendanceScreen());
        },
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.class_, color: AppColors.primary),
        ),
        title: Text(batch.batchName,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          '${batch.courseName} · ${batch.studentCount} students\n${batch.classDays} · ${batch.startTime}–${batch.endTime}',
          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        isThreeLine: true,
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}
