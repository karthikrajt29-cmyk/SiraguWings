import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../config/themes/app_theme.dart';
import '../controller/auth_controller.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});



  @override
  Widget build(BuildContext context) {
    Get.find<AuthController>();
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.school, size: 72, color: AppColors.primary),
            SizedBox(height: 16),
            Text(
              'SiraguWings',
              style: TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Parent Super App',
              style: TextStyle(color: Colors.white60, fontSize: 14),
            ),
            SizedBox(height: 40),
            CircularProgressIndicator(color: AppColors.primary),
          ],
        ),
      ),
    );
  }
}
