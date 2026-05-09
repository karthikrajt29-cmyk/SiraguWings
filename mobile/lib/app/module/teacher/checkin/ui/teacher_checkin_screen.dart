import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../../config/themes/app_theme.dart';
import '../controller/checkin_controller.dart';
import '../model/checkin_model.dart';

class TeacherCheckInScreen extends StatelessWidget {
  const TeacherCheckInScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<CheckInController>();
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        title: const Text('My Attendance',
            style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: ctrl.loadHistory,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Obx(() {
                final today = ctrl.todayRecord.value;
                final isCheckedIn = today != null && today.isPresent;
                final checkingIn = ctrl.checkingIn.value;
                return _CheckInCard(
                  today: today,
                  isCheckedIn: isCheckedIn,
                  checkingIn: checkingIn,
                  ctrl: ctrl,
                );
              }),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
                child: const Text(
                  'RECENT HISTORY',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary,
                    letterSpacing: 1.0,
                  ),
                ),
              ),
            ),
            Obx(() {
              if (ctrl.loading.value) {
                return const SliverToBoxAdapter(
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (ctrl.history.isEmpty) {
                return const SliverToBoxAdapter(
                  child: Center(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Text('No check-in history yet.',
                          style:
                              TextStyle(color: AppColors.textSecondary)),
                    ),
                  ),
                );
              }
              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (_, i) => _HistoryTile(ctrl.history[i]),
                  childCount: ctrl.history.length,
                ),
              );
            }),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),
          ],
        ),
      ),
    );
  }
}

// ── Today's check-in card ────────────────────────────────────────────────────

class _CheckInCard extends StatelessWidget {
  const _CheckInCard({
    required this.today,
    required this.isCheckedIn,
    required this.checkingIn,
    required this.ctrl,
  });
  final CheckInRecord? today;
  final bool isCheckedIn;
  final bool checkingIn;
  final CheckInController ctrl;

  @override
  Widget build(BuildContext context) {

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isCheckedIn
              ? [AppColors.approved, const Color(0xFF16A34A)]
              : [AppColors.navy, const Color(0xFF1E3A5F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: (isCheckedIn ? AppColors.approved : AppColors.navy)
                .withValues(alpha: 0.3),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isCheckedIn
                      ? Icons.check_circle_rounded
                      : Icons.qr_code_scanner_rounded,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isCheckedIn ? 'Checked In' : 'Not Checked In',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      DateFormat('EEEE, d MMM yyyy').format(DateTime.now()),
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (isCheckedIn) ...[
            const SizedBox(height: 16),
            const Divider(color: Colors.white24),
            const SizedBox(height: 12),
            Row(
              children: [
                _InfoBadge(
                  Icons.access_time_rounded,
                  today!.checkInTime ?? '--',
                  'Time',
                ),
                const SizedBox(width: 12),
                _InfoBadge(
                  Icons.business_rounded,
                  today!.centerName.replaceAll('SiraguWings ', ''),
                  'Center',
                ),
                if (today!.latitude != null) ...[
                  const SizedBox(width: 12),
                  _InfoBadge(
                    Icons.location_on_rounded,
                    '${today!.latitude!.toStringAsFixed(3)}, ${today!.longitude!.toStringAsFixed(3)}',
                    'Location',
                  ),
                ],
              ],
            ),
          ] else ...[
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: checkingIn
                  ? const Center(
                      child: CircularProgressIndicator(color: Colors.white))
                  : ElevatedButton.icon(
                      onPressed: () => _openQrScanner(context, ctrl),
                      icon: const Icon(Icons.qr_code_scanner_rounded),
                      label: const Text('Scan Center QR to Check In'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.navy,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
            ),
          ],
        ],
      ),
    );
  }

  void _openQrScanner(BuildContext context, CheckInController ctrl) {
    Get.to(() => _CenterQrScannerPage(ctrl: ctrl));
  }
}

class _InfoBadge extends StatelessWidget {
  const _InfoBadge(this.icon, this.value, this.label);
  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: Colors.white70, size: 12),
                const SizedBox(width: 4),
                Text(label,
                    style: const TextStyle(
                        color: Colors.white54, fontSize: 10)),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

// ── History tile ─────────────────────────────────────────────────────────────

class _HistoryTile extends StatelessWidget {
  const _HistoryTile(this.record);
  final CheckInRecord record;

  @override
  Widget build(BuildContext context) {
    final color =
        record.isPresent ? AppColors.approved : AppColors.rejected;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                record.isPresent
                    ? Icons.check_circle_rounded
                    : Icons.cancel_rounded,
                color: color,
                size: 18,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _formatDate(record.date),
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  Text(
                    record.centerName,
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    record.status,
                    style: TextStyle(
                        color: color,
                        fontSize: 11,
                        fontWeight: FontWeight.w600),
                  ),
                ),
                if (record.checkInTime != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    record.checkInTime!,
                    style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w500),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso);
      return DateFormat('EEE, d MMM yyyy').format(dt);
    } catch (_) {
      return iso;
    }
  }
}

// ── Center QR scanner page ───────────────────────────────────────────────────

class _CenterQrScannerPage extends StatefulWidget {
  const _CenterQrScannerPage({required this.ctrl});
  final CheckInController ctrl;

  @override
  State<_CenterQrScannerPage> createState() => _CenterQrScannerPageState();
}

class _CenterQrScannerPageState extends State<_CenterQrScannerPage> {
  final MobileScannerController _scanner = MobileScannerController();
  bool _processing = false;

  @override
  void dispose() {
    _scanner.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_processing) return;
    final raw = capture.barcodes.firstOrNull?.rawValue;
    if (raw == null) return;

    _processing = true;
    await _scanner.stop();

    final ok = await widget.ctrl.handleCenterQr(raw);
    if (!mounted) return;

    if (ok) {
      Get.back();
      Get.snackbar(
        'Checked In!',
        'Your attendance has been recorded.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: AppColors.approved,
        colorText: Colors.white,
        duration: const Duration(seconds: 3),
      );
    } else {
      Get.snackbar(
        'Invalid QR',
        'This QR code is not a SiraguWings center QR.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: AppColors.rejected,
        colorText: Colors.white,
      );
      _processing = false;
      await _scanner.start();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: const Text('Scan Center QR Code',
            style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on_rounded, color: Colors.white),
            onPressed: () => _scanner.toggleTorch(),
          ),
          IconButton(
            icon: const Icon(Icons.flip_camera_ios_rounded,
                color: Colors.white),
            onPressed: () => _scanner.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(controller: _scanner, onDetect: _onDetect),
          // Corner-bracket overlay
          Center(
            child: SizedBox(
              width: 240,
              height: 240,
              child: CustomPaint(painter: _CornerPainter()),
            ),
          ),
          Positioned(
            bottom: 60,
            left: 0,
            right: 0,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: const Text(
                    'Point camera at the center\'s entrance QR code',
                    style:
                        TextStyle(color: Colors.white70, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Format: SWCENTER:<center_id>:<center_name>',
                  style:
                      TextStyle(color: Colors.white30, fontSize: 10),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CornerPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.primary
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    const len = 28.0;
    const r = 10.0;

    // Top-left
    canvas.drawLine(Offset(r, 0), Offset(len, 0), paint);
    canvas.drawLine(Offset(0, r), Offset(0, len), paint);
    // Top-right
    canvas.drawLine(Offset(size.width - len, 0), Offset(size.width - r, 0), paint);
    canvas.drawLine(Offset(size.width, r), Offset(size.width, len), paint);
    // Bottom-left
    canvas.drawLine(Offset(0, size.height - len), Offset(0, size.height - r), paint);
    canvas.drawLine(Offset(r, size.height), Offset(len, size.height), paint);
    // Bottom-right
    canvas.drawLine(Offset(size.width, size.height - len), Offset(size.width, size.height - r), paint);
    canvas.drawLine(Offset(size.width - len, size.height), Offset(size.width - r, size.height), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
