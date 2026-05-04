import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../config/routes/app_routes.dart';
import '../../../config/themes/app_theme.dart';
import '../../auth/controller/auth_controller.dart';
import '../../sos/ui/sos_button.dart';
import '../controller/dashboard_controller.dart';
import 'owner_home_tab.dart';
import 'parent_home_tab.dart';
import 'teacher_home_tab.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<DashboardController>();
    final auth = Get.find<AuthController>();

    return Obx(() {
      final role = auth.currentRole.value;
      final tabs = _tabsForRole(role);

      return Scaffold(
        appBar: AppBar(
          title: const Text('SiraguWings'),
          actions: [
            if (role == 'Parent' || role == 'Teacher') const SosButton(),
            IconButton(
              icon: const Icon(Icons.notifications_outlined),
              onPressed: () => Get.toNamed(AppRoutes.notifications),
            ),
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (v) {
                if (v == 'switch') Get.toNamed(AppRoutes.rolePicker);
                if (v == 'logout') auth.logout();
              },
              itemBuilder: (_) => [
                if ((auth.profile.value?.distinctRoles.length ?? 0) > 1)
                  const PopupMenuItem(value: 'switch', child: Text('Switch role')),
                const PopupMenuItem(value: 'logout', child: Text('Sign out')),
              ],
            ),
          ],
        ),
        body: IndexedStack(
          index: ctrl.tabIndex.value,
          children: tabs.map((t) => t.screen).toList(),
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: ctrl.tabIndex.value,
          onDestinationSelected: ctrl.setTab,
          destinations: tabs
              .map((t) => NavigationDestination(
                    icon: Icon(t.icon),
                    label: t.label,
                  ))
              .toList(),
        ),
      );
    });
  }

  List<_Tab> _tabsForRole(String role) {
    switch (role) {
      case 'Owner':
        return [
          _Tab('Home', Icons.home, const OwnerHomeTab()),
          _Tab('Students', Icons.people, _PlaceholderTab('Students')),
          _Tab('Fees', Icons.receipt_long, _PlaceholderTab('Fees')),
          _Tab('More', Icons.more_horiz, _PlaceholderTab('More')),
        ];
      case 'Parent':
        return [
          _Tab('Home', Icons.home, const ParentHomeTab()),
          _Tab('My Kids', Icons.child_care, _PlaceholderTab('My Kids')),
          _Tab('Fees', Icons.receipt_long, _PlaceholderTab('Fees')),
          _Tab('Alerts', Icons.notifications, _PlaceholderTab('Notifications')),
        ];
      case 'Teacher':
        return [
          _Tab('Home', Icons.home, const TeacherHomeTab()),
          _Tab('Batches', Icons.class_, _PlaceholderTab('Batches')),
          _Tab('Activities', Icons.photo_camera, _PlaceholderTab('Activities')),
          _Tab('More', Icons.more_horiz, _PlaceholderTab('More')),
        ];
      default:
        return [_Tab('Home', Icons.home, _PlaceholderTab('Home'))];
    }
  }
}

class _Tab {
  const _Tab(this.label, this.icon, this.screen);
  final String label;
  final IconData icon;
  final Widget screen;
}

class _PlaceholderTab extends StatelessWidget {
  const _PlaceholderTab(this.name);
  final String name;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        name,
        style: const TextStyle(
          fontSize: 18,
          color: AppColors.textSecondary,
        ),
      ),
    );
  }
}
