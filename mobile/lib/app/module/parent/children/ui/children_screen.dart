import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../config/themes/app_theme.dart';
import '../controller/children_controller.dart';
import '../model/child_model.dart';
import 'child_attendance_screen.dart';

class ChildrenScreen extends StatelessWidget {
  const ChildrenScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<ChildrenController>();
    return Scaffold(
      appBar: AppBar(title: const Text('My Children')),
      body: Obx(() {
        if (ctrl.loading.value) {
          return const Center(child: CircularProgressIndicator());
        }
        if (ctrl.children.isEmpty) {
          return const Center(
            child: Text('No children linked.',
                style: TextStyle(color: AppColors.textSecondary)),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: ctrl.children.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (_, i) => _ChildCard(ctrl.children[i]),
        );
      }),
    );
  }
}

class _ChildCard extends StatelessWidget {
  const _ChildCard(this.child);
  final ChildSummary child;

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<ChildrenController>();
    return Card(
      child: ListTile(
        onTap: () {
          ctrl.openChild(child);
          Get.to(() => const ChildAttendanceScreen());
        },
        leading: CircleAvatar(
          backgroundColor: AppColors.primary.withValues(alpha: 0.1),
          child: Text(
            child.name.isNotEmpty ? child.name[0].toUpperCase() : '?',
            style: const TextStyle(
                color: AppColors.primary, fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(child.name,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          child.centers.map((c) => c.centerName).join(', '),
          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}
