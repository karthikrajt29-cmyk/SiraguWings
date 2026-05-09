import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../config/themes/app_theme.dart';
import '../model/nearby_center_model.dart';

class CenterDetailScreen extends StatelessWidget {
  const CenterDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final center = Get.arguments as NearbyCenter;
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: CustomScrollView(
        slivers: [
          _HeroAppBar(center: center),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name + rating row
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              center.name,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                ...List.generate(5, (i) {
                                  final filled = i < center.rating.floor();
                                  final half = !filled &&
                                      i < center.rating &&
                                      center.rating - i >= 0.5;
                                  return Icon(
                                    half
                                        ? Icons.star_half_rounded
                                        : filled
                                            ? Icons.star_rounded
                                            : Icons.star_outline_rounded,
                                    color: const Color(0xFFF59E0B),
                                    size: 18,
                                  );
                                }),
                                const SizedBox(width: 6),
                                Text(
                                  '${center.rating} (${center.reviewCount} reviews)',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      if (center.isEnrolled)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppColors.approved.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                                color:
                                    AppColors.approved.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(Icons.check_circle_rounded,
                                  color: AppColors.approved, size: 14),
                              SizedBox(width: 5),
                              Text(
                                'Enrolled',
                                style: TextStyle(
                                  color: AppColors.approved,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Info tiles
                  _InfoCard(children: [
                    _InfoRow(
                      Icons.location_on_rounded,
                      'Address',
                      center.address,
                      AppColors.primary,
                    ),
                    const Divider(height: 1, indent: 48, endIndent: 0),
                    _InfoRow(
                      Icons.phone_rounded,
                      'Phone',
                      center.phone,
                      AppColors.approved,
                    ),
                    const Divider(height: 1, indent: 48, endIndent: 0),
                    _InfoRow(
                      Icons.access_time_rounded,
                      'Hours',
                      '${center.openTime} – ${center.closeTime}',
                      AppColors.navy,
                    ),
                    const Divider(height: 1, indent: 48, endIndent: 0),
                    _InfoRow(
                      Icons.directions_walk_rounded,
                      'Distance',
                      '${center.distanceKm} km away',
                      AppColors.accent,
                    ),
                  ]),

                  const SizedBox(height: 20),

                  // Courses
                  const Text(
                    'COURSES OFFERED',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: center.courses.asMap().entries.map((e) {
                      final colors = [
                        AppColors.primary,
                        AppColors.navy,
                        const Color(0xFF8B5CF6),
                        AppColors.approved,
                        AppColors.accent,
                      ];
                      final c = colors[e.key % colors.length];
                      return Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: c.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(24),
                          border:
                              Border.all(color: c.withValues(alpha: 0.25)),
                        ),
                        child: Text(
                          e.value,
                          style: TextStyle(
                            color: c,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 20),

                  // Map placeholder
                  const Text(
                    'LOCATION',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      height: 160,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: AppColors.navy.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Grid lines to simulate a map
                          CustomPaint(
                            size: const Size(double.infinity, 160),
                            painter: _MapGridPainter(),
                          ),
                          Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.location_on_rounded,
                                  color: AppColors.primary, size: 36),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 5),
                                decoration: BoxDecoration(
                                  color: AppColors.navy,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  center.name
                                      .replaceAll('SiraguWings ', ''),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),

                  // Action buttons
                  Row(
                    children: [
                      Expanded(
                        child: _ActionBtn(
                          icon: Icons.call_rounded,
                          label: 'Call',
                          color: AppColors.approved,
                          filled: false,
                          onTap: () => Get.snackbar(
                            'Calling',
                            center.phone,
                            snackPosition: SnackPosition.BOTTOM,
                            duration: const Duration(seconds: 2),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _ActionBtn(
                          icon: Icons.directions_rounded,
                          label: 'Directions',
                          color: AppColors.navy,
                          filled: false,
                          onTap: () => Get.snackbar(
                            'Directions',
                            'Opening maps for ${center.name}',
                            snackPosition: SnackPosition.BOTTOM,
                            duration: const Duration(seconds: 2),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: _ActionBtn(
                      icon: center.isEnrolled
                          ? Icons.check_circle_rounded
                          : Icons.how_to_reg_rounded,
                      label: center.isEnrolled
                          ? 'Already Enrolled'
                          : 'Enquire / Enroll',
                      color: AppColors.primary,
                      filled: true,
                      onTap: () => Get.snackbar(
                        center.isEnrolled
                            ? 'Already Enrolled'
                            : 'Enquiry Sent',
                        center.isEnrolled
                            ? 'Your child is enrolled at this center.'
                            : 'The center will contact you shortly.',
                        snackPosition: SnackPosition.BOTTOM,
                        backgroundColor: center.isEnrolled
                            ? AppColors.approved
                            : AppColors.primary,
                        colorText: Colors.white,
                        duration: const Duration(seconds: 3),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Hero image app bar ────────────────────────────────────────────────────────

class _HeroAppBar extends StatelessWidget {
  const _HeroAppBar({required this.center});
  final NearbyCenter center;

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      expandedHeight: 240,
      pinned: true,
      backgroundColor: AppColors.navy,
      leading: GestureDetector(
        onTap: () => Get.back(),
        child: Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.black38,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.arrow_back_rounded,
              color: Colors.white, size: 20),
        ),
      ),
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            center.photoUrl != null
                ? Image.network(
                    center.photoUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const _PlaceholderImg(),
                  )
                : const _PlaceholderImg(),
            // Gradient overlay
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Colors.black54],
                  stops: [0.5, 1.0],
                ),
              ),
            ),
            // Distance badge
            Positioned(
              bottom: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.near_me_rounded,
                        color: Colors.white, size: 13),
                    const SizedBox(width: 5),
                    Text(
                      '${center.distanceKm} km',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlaceholderImg extends StatelessWidget {
  const _PlaceholderImg();
  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.navy,
      child: const Center(
        child: Icon(Icons.business_rounded, size: 64, color: Colors.white24),
      ),
    );
  }
}

// ── Info card / row ───────────────────────────────────────────────────────────

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(children: children),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.icon, this.label, this.value, this.color);
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Action button ─────────────────────────────────────────────────────────────

class _ActionBtn extends StatelessWidget {
  const _ActionBtn({
    required this.icon,
    required this.label,
    required this.color,
    required this.filled,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final bool filled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: filled ? color : color.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(14),
          border: filled
              ? null
              : Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: filled ? Colors.white : color, size: 18),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: filled ? Colors.white : color,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Map grid painter ──────────────────────────────────────────────────────────

class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.navy.withValues(alpha: 0.07)
      ..strokeWidth = 1;

    for (double x = 0; x < size.width; x += 30) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += 30) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }

    // A couple of "road" lines
    final road = Paint()
      ..color = AppColors.navy.withValues(alpha: 0.12)
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
        Offset(0, size.height * 0.4),
        Offset(size.width, size.height * 0.4),
        road);
    canvas.drawLine(
        Offset(size.width * 0.35, 0),
        Offset(size.width * 0.35, size.height),
        road);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
