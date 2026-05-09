import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../config/routes/app_routes.dart';
import '../../../config/themes/app_theme.dart';
import '../../auth/controller/auth_controller.dart';
import '../../owner/fees/ui/owner_fees_screen.dart';
import '../../owner/students/ui/owner_students_screen.dart';
import '../../parent/children/ui/children_screen.dart';
import '../../parent/nearby/ui/nearby_centers_screen.dart';
import '../../sos/ui/sos_button.dart';
import '../../teacher/batches/ui/teacher_batches_screen.dart';
import '../../chat/ui/conversations_screen.dart';
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

      // Role not resolved yet — show a loading screen to avoid NavigationBar
      // assertion (requires ≥ 2 destinations).
      if (role.isEmpty) {
        return const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        );
      }

      final tabs = _tabsForRole(role);
      final profile = auth.profile.value;

      return Scaffold(
        backgroundColor: AppColors.surface,
        appBar: _DashboardAppBar(
          role: role,
          name: profile?.name ?? '',
          imageUrl: profile?.profileImageUrl,
          auth: auth,
          ctrl: ctrl,
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
      case 'Admin':
        return [
          _Tab('Home', Icons.home_rounded, const OwnerHomeTab()),
          _Tab('Students', Icons.people_rounded, const OwnerStudentsScreen()),
          _Tab('Fees', Icons.receipt_long_rounded, const OwnerFeesScreen()),
          _Tab('More', Icons.grid_view_rounded, const _OwnerMoreTab()),
        ];
      case 'Parent':
        return [
          _Tab('Home', Icons.home_rounded, const ParentHomeTab()),
          _Tab('My Kids', Icons.child_care_rounded, const ChildrenScreen()),
          _Tab('Nearby', Icons.location_on_rounded, const NearbyCentersScreen()),
          _Tab('More', Icons.grid_view_rounded, const _ParentMoreTab()),
        ];
      case 'Teacher':
        return [
          _Tab('Home', Icons.home_rounded, const TeacherHomeTab()),
          _Tab('Batches', Icons.class_rounded, const TeacherBatchesScreen()),
          _Tab('Chat', Icons.chat_bubble_rounded, const ConversationsScreen()),
          _Tab('More', Icons.grid_view_rounded, const _TeacherMoreTab()),
        ];
      default:
        return [
          _Tab('Home', Icons.home_rounded, _PlaceholderTab('Home')),
          _Tab('More', Icons.grid_view_rounded, _PlaceholderTab('More')),
        ];
    }
  }
}

// ── AppBar ───────────────────────────────────────────────────────────────────

class _DashboardAppBar extends StatelessWidget implements PreferredSizeWidget {
  const _DashboardAppBar({
    required this.role,
    required this.name,
    this.imageUrl,
    required this.auth,
    required this.ctrl,
  });

  final String role;
  final String name;
  final String? imageUrl;
  final AuthController auth;
  final DashboardController ctrl;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.navy,
      titleSpacing: 16,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.asset(
            'assets/images/logo.png',
            height: 24,
            errorBuilder: (_, __, ___) => const Text(
              'SiraguWings',
              style: TextStyle(
                color: Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.3,
              ),
            ),
          ),
          if (role == 'Owner')
            Obx(() {
              final centerName = _activeCenterName(auth, ctrl);
              if (centerName == null) return const SizedBox.shrink();
              return Text(
                centerName,
                style: const TextStyle(
                  color: Colors.white54,
                  fontSize: 11,
                  fontWeight: FontWeight.w400,
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
            onTap: () => _showProfileSheet(context),
            child: CircleAvatar(
              radius: 17,
              backgroundColor: AppColors.primary,
              backgroundImage:
                  imageUrl != null ? NetworkImage(imageUrl!) : null,
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

  String? _activeCenterName(AuthController auth, DashboardController ctrl) {
    final viewId = ctrl.viewCenterId.value;
    if (viewId == kAllCenters) return 'All Centers';
    final entry = auth.profile.value?.roles
        .where((r) => r.centerId == viewId)
        .firstOrNull;
    return entry?.centerName;
  }

  void _showProfileSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _ProfileSheet(auth: auth, name: name, role: role),
    );
  }
}

// ── Profile sheet ────────────────────────────────────────────────────────────

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
              style:
                  const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          Text(role,
              style: const TextStyle(
                  fontSize: 13, color: AppColors.textSecondary)),
          const SizedBox(height: 20),
          const Divider(),
          if ((auth.profile.value?.distinctRoles.length ?? 0) > 1)
            ListTile(
              leading: const Icon(Icons.swap_horiz_rounded,
                  color: AppColors.primary),
              title: const Text('Switch Role'),
              onTap: () {
                Get.back();
                Get.toNamed(AppRoutes.rolePicker);
              },
            ),
          ListTile(
            leading:
                const Icon(Icons.person_outline_rounded, color: AppColors.navy),
            title: const Text('My Profile'),
            onTap: () => Get.back(),
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

// ── Bottom nav ───────────────────────────────────────────────────────────────

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
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
          child: Row(
            children: tabs.asMap().entries.map((e) {
              final i = e.key;
              final tab = e.value;
              final selected = i == index;
              return Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onTap(i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeInOut,
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    decoration: selected
                        ? BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(14),
                          )
                        : null,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          child: Icon(
                            tab.icon,
                            size: selected ? 24 : 22,
                            color: selected
                                ? AppColors.primary
                                : AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          tab.label,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: selected
                                ? FontWeight.w700
                                : FontWeight.w500,
                            color: selected
                                ? AppColors.primary
                                : AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}

// ── Owner "More" tab ─────────────────────────────────────────────────────────

class _OwnerMoreTab extends StatelessWidget {
  const _OwnerMoreTab();

  @override
  Widget build(BuildContext context) {
    final sections = [
      _MoreSection('Manage', [
        _MoreItem(Icons.class_rounded, 'Batches',
            'View and manage class batches', AppColors.accent,
            AppRoutes.ownerBatches),
        _MoreItem(Icons.person_rounded, 'Staff',
            'Teachers & instructors', AppColors.navy,
            AppRoutes.ownerStaff),
        _MoreItem(Icons.family_restroom_rounded, 'Parents',
            'Parent contacts & their kids', AppColors.pending,
            AppRoutes.ownerParents),
      ]),
      _MoreSection('Insights', [
        _MoreItem(Icons.bar_chart_rounded, 'Reports',
            'Revenue & attendance analytics', AppColors.rejected,
            AppRoutes.ownerReports),
        _MoreItem(Icons.fact_check_rounded, 'Attendance',
            'Daily attendance tracking', AppColors.accent,
            AppRoutes.ownerAttendance),
      ]),
      _MoreSection('Settings', [
        _MoreItem(Icons.business_rounded, 'Centers',
            'Manage your centers', AppColors.primary,
            AppRoutes.ownerCenterSwitcher),
      ]),
    ];

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
            color: AppColors.navy,
            child: const Text(
              'More',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        for (final section in sections) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              child: Text(
                section.title.toUpperCase(),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                  letterSpacing: 1.0,
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: section.items.mapIndexed((i, item) {
                    final isLast = i == section.items.length - 1;
                    return Column(
                      children: [
                        ListTile(
                          onTap: () => Get.toNamed(item.route),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 4),
                          leading: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: item.color.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(item.icon, color: item.color, size: 20),
                          ),
                          title: Text(
                            item.title,
                            style: const TextStyle(
                                fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                          subtitle: Text(
                            item.subtitle,
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.textSecondary),
                          ),
                          trailing: const Icon(Icons.chevron_right,
                              color: AppColors.textSecondary, size: 20),
                        ),
                        if (!isLast)
                          const Divider(height: 1, indent: 60, endIndent: 16),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ),
        ],
        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }
}

class _MoreSection {
  const _MoreSection(this.title, this.items);
  final String title;
  final List<_MoreItem> items;
}

class _MoreItem {
  const _MoreItem(this.icon, this.title, this.subtitle, this.color, this.route);
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final String route;
}

// ── Teacher "More" tab ───────────────────────────────────────────────────────

class _TeacherMoreTab extends StatelessWidget {
  const _TeacherMoreTab();

  @override
  Widget build(BuildContext context) {
    final sections = [
      _MoreSection('Communicate', [
        _MoreItem(Icons.folder_open_rounded, 'Materials',
            'Share notes, PDFs & assignments', AppColors.accent,
            AppRoutes.materials),
        _MoreItem(Icons.campaign_rounded, 'Announcements',
            'Broadcast messages to parents', AppColors.primary,
            AppRoutes.announcements),
      ]),
      _MoreSection('Tools', [
        _MoreItem(Icons.qr_code_scanner_rounded, 'Check In',
            'Scan center QR to mark attendance', AppColors.approved,
            AppRoutes.teacherCheckIn),
        _MoreItem(Icons.class_rounded, 'My Batches',
            'View and manage your batches', AppColors.navy,
            AppRoutes.teacherBatches),
      ]),
    ];

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
            color: AppColors.navy,
            child: const Text(
              'More',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        for (final section in sections) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              child: Text(
                section.title.toUpperCase(),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                  letterSpacing: 1.0,
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: section.items.mapIndexed((i, item) {
                    final isLast = i == section.items.length - 1;
                    return Column(
                      children: [
                        ListTile(
                          onTap: () => Get.toNamed(item.route),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 4),
                          leading: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: item.color.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child:
                                Icon(item.icon, color: item.color, size: 20),
                          ),
                          title: Text(item.title,
                              style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600)),
                          subtitle: Text(item.subtitle,
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondary)),
                          trailing: const Icon(Icons.chevron_right,
                              color: AppColors.textSecondary, size: 20),
                        ),
                        if (!isLast)
                          const Divider(
                              height: 1, indent: 60, endIndent: 16),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ),
        ],
        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }
}

// ── Parent "More" tab ────────────────────────────────────────────────────────

class _ParentMoreTab extends StatelessWidget {
  const _ParentMoreTab();

  @override
  Widget build(BuildContext context) {
    final sections = [
      _MoreSection('Learning', [
        _MoreItem(Icons.folder_open_rounded, 'Study Materials',
            'Notes, PDFs & assignments from teachers', AppColors.accent,
            AppRoutes.materials),
        _MoreItem(Icons.chat_bubble_rounded, 'Messages',
            'Chat with teachers & staff', const Color(0xFF6366F1),
            AppRoutes.chat),
        _MoreItem(Icons.smart_toy_rounded, 'AI Assistant',
            'Ask about attendance, fees & schedule', const Color(0xFF8B5CF6),
            AppRoutes.parentChatbot),
      ]),
      _MoreSection('Finance', [
        _MoreItem(Icons.receipt_long_rounded, 'Fee Payments',
            'View dues & payment history', AppColors.approved,
            AppRoutes.parentFees),
      ]),
      _MoreSection('Explore', [
        _MoreItem(Icons.location_on_rounded, 'Nearby Centers',
            'Find SiraguWings branches near you', AppColors.primary,
            AppRoutes.nearbyCenters),
        _MoreItem(Icons.notifications_rounded, 'Notifications',
            'Alerts & updates from center', AppColors.navy,
            AppRoutes.notifications),
      ]),
    ];

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.navy, Color(0xFF1E3A5F)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: const Text(
              'More',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        for (final section in sections) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              child: Text(
                section.title.toUpperCase(),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                  letterSpacing: 1.0,
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: section.items.mapIndexed((i, item) {
                    final isLast = i == section.items.length - 1;
                    return Column(
                      children: [
                        ListTile(
                          onTap: () => Get.toNamed(item.route),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 4),
                          leading: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: item.color.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(item.icon, color: item.color, size: 20),
                          ),
                          title: Text(item.title,
                              style: const TextStyle(
                                  fontSize: 14, fontWeight: FontWeight.w600)),
                          subtitle: Text(item.subtitle,
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondary)),
                          trailing: const Icon(Icons.chevron_right,
                              color: AppColors.textSecondary, size: 20),
                        ),
                        if (!isLast)
                          const Divider(height: 1, indent: 60, endIndent: 16),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ),
        ],
        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
              style:
                  TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

extension<T> on List<T> {
  List<R> mapIndexed<R>(R Function(int index, T item) fn) {
    final result = <R>[];
    for (var i = 0; i < length; i++) {
      result.add(fn(i, this[i]));
    }
    return result;
  }
}
