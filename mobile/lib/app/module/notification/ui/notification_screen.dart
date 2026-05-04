import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../config/themes/app_theme.dart';
import '../controller/notification_controller.dart';

class NotificationScreen extends StatelessWidget {
  const NotificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<NotificationController>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: ctrl.markAllRead,
            child: const Text('Mark all read',
                style: TextStyle(color: Colors.white70)),
          ),
        ],
      ),
      body: Obx(() {
        if (ctrl.loading.value) {
          return const Center(child: CircularProgressIndicator());
        }
        if (ctrl.items.isEmpty) {
          return const Center(
            child: Text('No notifications',
                style: TextStyle(color: AppColors.textSecondary)),
          );
        }
        return RefreshIndicator(
          onRefresh: ctrl.load,
          child: ListView.separated(
            itemCount: ctrl.items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final n = ctrl.items[i];
              return ListTile(
                onTap: () => ctrl.markRead(n.id),
                tileColor: n.isRead ? null : AppColors.primary.withValues(alpha: 0.04),
                leading: Icon(
                  n.category == 'SOS' ? Icons.sos : Icons.notifications,
                  color: n.isRead ? AppColors.textSecondary : AppColors.primary,
                ),
                title: Text(
                  n.title,
                  style: TextStyle(
                    fontWeight: n.isRead ? FontWeight.normal : FontWeight.w600,
                  ),
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(n.body, maxLines: 2, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12)),
                    const SizedBox(height: 2),
                    Text(
                      DateFormat('dd MMM, hh:mm a')
                          .format(n.createdDate.toLocal()),
                      style: const TextStyle(
                          fontSize: 11, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      }),
    );
  }
}
