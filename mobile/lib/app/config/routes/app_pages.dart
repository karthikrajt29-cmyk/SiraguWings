import 'package:get/get.dart';

import '../../module/app_binding.dart';
import '../../module/auth/ui/splash_screen.dart';
import '../../module/auth/ui/demo_selection_screen.dart';
import '../../module/auth/ui/login_screen.dart';
import '../../module/auth/ui/role_picker_screen.dart';
import '../../module/dashboard/ui/dashboard_screen.dart';
import '../../module/notification/ui/notification_screen.dart';
import '../../module/sos/ui/sos_screen.dart';
import '../../module/teacher/batches/ui/teacher_batches_screen.dart';
import '../../module/teacher/checkin/ui/teacher_checkin_screen.dart';
import '../../module/parent/children/ui/children_screen.dart';
import '../../module/parent/fees/ui/parent_fees_screen.dart';
import '../../module/parent/nearby/ui/nearby_centers_screen.dart';
import '../../module/parent/nearby/ui/center_detail_screen.dart';
import '../../module/parent/chatbot/ui/chatbot_screen.dart';
import '../../module/owner/centers/ui/center_switcher_screen.dart';
import '../../module/owner/students/ui/owner_students_screen.dart';
import '../../module/owner/batches/ui/owner_batches_screen.dart';
import '../../module/owner/fees/ui/owner_fees_screen.dart';
import '../../module/owner/staff/ui/owner_staff_screen.dart';
import '../../module/owner/parents/ui/owner_parents_screen.dart';
import '../../module/owner/reports/ui/owner_reports_screen.dart';
import '../../module/owner/attendance/ui/owner_attendance_screen.dart';
import '../../module/chat/ui/conversations_screen.dart';
import '../../module/chat/ui/chat_thread_screen.dart';
import '../../module/materials/ui/materials_screen.dart';
import '../../module/announcements/ui/announcements_screen.dart';
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
      name: AppRoutes.demoSelect,
      page: () => const DemoSelectionScreen(),
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
      name: AppRoutes.teacherCheckIn,
      page: () => const TeacherCheckInScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.parentChildren,
      page: () => const ChildrenScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.parentFees,
      page: () => const ParentFeesScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.nearbyCenters,
      page: () => const NearbyCentersScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.centerDetail,
      page: () => const CenterDetailScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.parentChatbot,
      page: () => const ChatbotScreen(),
      binding: AppBinding(),
    ),
    // Owner routes
    GetPage(
      name: AppRoutes.ownerCenterSwitcher,
      page: () => const CenterSwitcherScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.ownerStudents,
      page: () => const OwnerStudentsScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.ownerBatches,
      page: () => const OwnerBatchesScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.ownerFees,
      page: () => const OwnerFeesScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.ownerStaff,
      page: () => const OwnerStaffScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.ownerParents,
      page: () => const OwnerParentsScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.ownerReports,
      page: () => const OwnerReportsScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.ownerAttendance,
      page: () => const OwnerAttendanceScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.chat,
      page: () => const ConversationsScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.chatThread,
      page: () => const ChatThreadScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.materials,
      page: () => const MaterialsScreen(),
      binding: AppBinding(),
    ),
    GetPage(
      name: AppRoutes.announcements,
      page: () => const AnnouncementsScreen(),
      binding: AppBinding(),
    ),
  ];
}
