import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../config/themes/app_theme.dart';
import '../controller/sos_controller.dart';

class SosScreen extends StatefulWidget {
  const SosScreen({super.key});

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> {
  late final SosController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = Get.find<SosController>();
    _ctrl.loadAlerts();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('SOS Alerts')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              height: 64,
              child: ElevatedButton.icon(
                onPressed: _ctrl.raiseAlert,
                icon: const Icon(Icons.sos),
                label: const Text('RAISE SOS ALERT'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ),
          const Divider(),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Alert History',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ),
          Expanded(
            child: Obx(() {
              if (_ctrl.loadingAlerts.value) {
                return const Center(child: CircularProgressIndicator());
              }
              if (_ctrl.alerts.isEmpty) {
                return const Center(
                  child: Text(
                    'No alerts raised.',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                );
              }
              return ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _ctrl.alerts.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final a = _ctrl.alerts[i];
                  return Card(
                    child: ListTile(
                      leading: Icon(
                        Icons.warning_amber_rounded,
                        color: a.status == 'Open' ? Colors.red : Colors.grey,
                      ),
                      title: Text(a.userName),
                      subtitle: Text(
                        DateFormat('dd MMM yyyy, hh:mm a')
                            .format(a.createdDate.toLocal()),
                        style: const TextStyle(fontSize: 12),
                      ),
                      trailing: _StatusChip(a.status),
                    ),
                  );
                },
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip(this.status);
  final String status;

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case 'Open': color = Colors.red; break;
      case 'Acknowledged': color = AppColors.pending; break;
      default: color = AppColors.approved;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        border: Border.all(color: color),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status,
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }
}
