import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../config/themes/app_theme.dart';
import '../../../auth/controller/auth_controller.dart';
import '../controller/centers_controller.dart';
import '../model/center_summary.dart';

class CenterSwitcherScreen extends StatelessWidget {
  const CenterSwitcherScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.put(CentersController());
    final auth = Get.find<AuthController>();

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Switch Center'),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
      ),
      body: Obx(() {
        if (ctrl.loading.value) {
          return const Center(
              child: CircularProgressIndicator(color: AppColors.primary));
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: ctrl.centers.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (_, i) {
            final c = ctrl.centers[i];
            final isSelected = auth.currentCenterId.value == c.id;
            return _CenterCard(
              center: c,
              isSelected: isSelected,
              onTap: () => ctrl.selectCenter(c),
            );
          },
        );
      }),
    );
  }
}

class _CenterCard extends StatelessWidget {
  const _CenterCard({
    required this.center,
    required this.isSelected,
    required this.onTap,
  });

  final CenterSummary center;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.business_rounded,
                  color: AppColors.primary, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    center.name,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  if (center.city != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      center.city!,
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _Chip(
                          '${center.studentCount} students',
                          Icons.people_rounded),
                      const SizedBox(width: 8),
                      _Chip(
                          '${center.batchCount} batches',
                          Icons.class_rounded),
                    ],
                  ),
                ],
              ),
            ),
            if (isSelected)
              const Icon(Icons.check_circle_rounded,
                  color: AppColors.primary, size: 22),
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip(this.label, this.icon);
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 11, color: AppColors.textSecondary),
        const SizedBox(width: 3),
        Text(label,
            style: const TextStyle(
                fontSize: 11, color: AppColors.textSecondary)),
      ],
    );
  }
}
