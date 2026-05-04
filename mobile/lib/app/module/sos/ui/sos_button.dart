import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../controller/sos_controller.dart';

class SosButton extends StatelessWidget {
  const SosButton({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<SosController>();
    return Obx(() => ctrl.sending.value
        ? const Padding(
            padding: EdgeInsets.all(12),
            child: SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
          )
        : IconButton(
            icon: const Icon(Icons.sos, color: Colors.red),
            tooltip: 'Emergency SOS',
            onPressed: ctrl.raiseAlert,
          ));
  }
}
