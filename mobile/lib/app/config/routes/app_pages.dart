import 'package:get/get.dart';

import '../../module/app_binding.dart';
import '../../module/auth/ui/splash_screen.dart';
import '../../module/auth/ui/login_screen.dart';
import '../../module/auth/ui/role_picker_screen.dart';
import '../../module/dashboard/ui/dashboard_screen.dart';
import '../../module/notification/ui/notification_screen.dart';
import '../../module/sos/ui/sos_screen.dart';
import '../../module/teacher/batches/ui/teacher_batches_screen.dart';
import '../../module/parent/children/ui/children_screen.dart';
import 'app_routes.dart';

class AppPages {
  static const initial = AppRoutes.splash;

  static final routes = [
    GetPage(
      name: AppRoutes.splash,
      page: () => const SplashScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.login,
      page: () => const LoginScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.rolePicker,
      page: () => const RolePickerScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.home,
      page: () => const DashboardScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.notifications,
      page: () => const NotificationScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.sos,
      page: () => const SosScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.teacherBatches,
      page: () => const TeacherBatchesScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.parentChildren,
      page: () => const ChildrenScreen(),
      binding: AppBinding(),
    ),
  ];
}
