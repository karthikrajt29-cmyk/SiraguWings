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
      final profile = auth.profile.value;

      return Scaffold(
        backgroundColor: AppColors.surface,
        appBar: _DashboardAppBar(
          role: role,
          name: profile?.name ?? '',
          imageUrl: profile?.profileImageUrl,
          auth: auth,
        ),
        body: IndexedStack(
          index: ctrl.tabIndex.value,
          children: tabs.map((t) => t.screen).toList(),
        ),
        bottomNavigationBar: _BottomNav(
          tabs: tabs,
          index: ctrl.tabIndex.value,
          onTap: ctrl.setTab,
        ),
      );
    });
  }

  List<_Tab> _tabsForRole(String role) {
    switch (role) {
      case 'Owner':
        return [
          _Tab('Home', Icons.home_rounded, const OwnerHomeTab()),
          _Tab('Students', Icons.people_rounded, _PlaceholderTab('Students')),
          _Tab('Fees', Icons.receipt_long_rounded, _PlaceholderTab('Fees')),
          _Tab('More', Icons.grid_view_rounded, _PlaceholderTab('More')),
        ];
      case 'Parent':
        return [
          _Tab('Home', Icons.home_rounded, const ParentHomeTab()),
          _Tab('My Kids', Icons.child_care_rounded, _PlaceholderTab('My Kids')),
          _Tab('Fees', Icons.receipt_long_rounded, _PlaceholderTab('Fees')),
          _Tab('Alerts', Icons.notifications_rounded, _PlaceholderTab('Notifications')),
        ];
      case 'Teacher':
        return [
          _Tab('Home', Icons.home_rounded, const TeacherHomeTab()),
          _Tab('Batches', Icons.class_rounded, _PlaceholderTab('Batches')),
          _Tab('Activities', Icons.camera_alt_rounded, _PlaceholderTab('Activities')),
          _Tab('More', Icons.grid_view_rounded, _PlaceholderTab('More')),
        ];
      default:
        return [_Tab('Home', Icons.home_rounded, _PlaceholderTab('Home'))];
    }
  }
}

class _DashboardAppBar extends StatelessWidget implements PreferredSizeWidget {
  const _DashboardAppBar({
    required this.role,
    required this.name,
    this.imageUrl,
    required this.auth,
  });

  final String role;
  final String name;
  final String? imageUrl;
  final AuthController auth;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.navy,
      titleSpacing: 16,
      title: Row(
        children: [
          Image.asset('assets/images/logo.png', height: 28, errorBuilder: (_, __, ___) {
            return const Text(
              'SiraguWings',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.3,
              ),
            );
          }),
        ],
      ),
      actions: [
        if (role == 'Parent' || role == 'Teacher') const SosButton(),
        IconButton(
          icon: const Icon(Icons.notifications_outlined, color: Colors.white),
          onPressed: () => Get.toNamed(AppRoutes.notifications),
        ),
        Padding(
          padding: const EdgeInsets.only(right: 12),
          child: GestureDetector(
            onTap: () => _showProfileMenu(context),
            child: CircleAvatar(
              radius: 17,
              backgroundColor: AppColors.primary,
              backgroundImage: imageUrl != null ? NetworkImage(imageUrl!) : null,
              child: imageUrl == null
                  ? Text(
                      name.isNotEmpty ? name[0].toUpperCase() : 'U',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    )
                  : null,
            ),
          ),
        ),
      ],
    );
  }

  void _showProfileMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _ProfileSheet(auth: auth, name: name, role: role),
    );
  }
}

class _ProfileSheet extends StatelessWidget {
  const _ProfileSheet({
    required this.auth,
    required this.name,
    required this.role,
  });

  final AuthController auth;
  final String name;
  final String role;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          CircleAvatar(
            radius: 30,
            backgroundColor: AppColors.primary.withValues(alpha: 0.15),
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : 'U',
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(name,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          Text(role,
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          const SizedBox(height: 20),
          const Divider(),
          if ((auth.profile.value?.distinctRoles.length ?? 0) > 1)
            ListTile(
              leading: const Icon(Icons.swap_horiz_rounded, color: AppColors.primary),
              title: const Text('Switch Role'),
              onTap: () {
                Get.back();
                Get.toNamed(AppRoutes.rolePicker);
              },
            ),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: AppColors.rejected),
            title: const Text('Sign Out',
                style: TextStyle(color: AppColors.rejected)),
            onTap: () {
              Get.back();
              auth.logout();
            },
          ),
        ],
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  const _BottomNav({
    required this.tabs,
    required this.index,
    required this.onTap,
  });

  final List<_Tab> tabs;
  final int index;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: index,
      onDestinationSelected: onTap,
      backgroundColor: Colors.white,
      indicatorColor: AppColors.primary.withValues(alpha: 0.12),
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      destinations: tabs
          .map((t) => NavigationDestination(
                icon: Icon(t.icon, color: AppColors.textSecondary),
                selectedIcon: Icon(t.icon, color: AppColors.primary),
                label: t.label,
              ))
          .toList(),
    );
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.construction_rounded, size: 48, color: AppColors.border),
          const SizedBox(height: 12),
          Text(name,
              style: const TextStyle(
                  fontSize: 16, color: AppColors.textSecondary)),
          const SizedBox(height: 4),
          const Text('Coming soon',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}
