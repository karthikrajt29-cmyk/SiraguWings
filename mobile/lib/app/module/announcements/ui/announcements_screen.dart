import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../config/themes/app_theme.dart';
import '../../auth/controller/auth_controller.dart';
import '../../teacher/batches/controller/teacher_batch_controller.dart';
import '../controller/announcement_controller.dart';
import '../model/announcement_model.dart';

class AnnouncementsScreen extends StatelessWidget {
  const AnnouncementsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<AnnouncementController>();
    final role = Get.find<AuthController>().currentRole.value;
    final isTeacher = role == 'Teacher';

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: ctrl.loadAnnouncements,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Container(
                color: AppColors.navy,
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Announcements',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Broadcast messages to parents',
                          style: TextStyle(color: Colors.white54, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Obx(() {
              if (ctrl.loading.value) {
                return const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.only(top: 80),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                );
              }
              if (ctrl.announcements.isEmpty) {
                return SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 80),
                    child: Column(
                      children: [
                        Icon(Icons.campaign_outlined,
                            size: 48, color: AppColors.border),
                        const SizedBox(height: 12),
                        const Text('No announcements yet',
                            style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 14)),
                        if (isTeacher) ...[
                          const SizedBox(height: 8),
                          const Text(
                              'Tap the button below to send your first announcement',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12)),
                        ]
                      ],
                    ),
                  ),
                );
              }
              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (_, i) => _AnnouncementCard(
                    ann: ctrl.announcements[i],
                  ),
                  childCount: ctrl.announcements.length,
                ),
              );
            }),
            const SliverToBoxAdapter(child: SizedBox(height: 80)),
          ],
        ),
      ),
      floatingActionButton: isTeacher
          ? Obx(() => FloatingActionButton.extended(
                heroTag: 'compose_ann',
                backgroundColor: AppColors.primary,
                onPressed: ctrl.sending.value
                    ? null
                    : () => _showComposeSheet(context, ctrl),
                icon: ctrl.sending.value
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.campaign_rounded, color: Colors.white),
                label: Text(
                  ctrl.sending.value ? 'Sending…' : 'New Announcement',
                  style: const TextStyle(color: Colors.white),
                ),
              ))
          : null,
    );
  }

  void _showComposeSheet(BuildContext context, AnnouncementController ctrl) {
    TeacherBatchController? batchCtrl;
    try {
      batchCtrl = Get.find<TeacherBatchController>();
    } catch (_) {}

    final batches = batchCtrl?.batches.toList() ?? [];
    final titleCtrl = TextEditingController();
    final bodyCtrl = TextEditingController();
    final selectedBatch = 'All'.obs;

    Get.bottomSheet(
      Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: EdgeInsets.fromLTRB(
            20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              const Text('New Announcement',
                  style:
                      TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              const Text('Will be sent as a notification to parents',
                  style: TextStyle(
                      fontSize: 12, color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              _ComposeField(
                  label: 'Title',
                  controller: titleCtrl,
                  hint: 'e.g. Class Rescheduled'),
              const SizedBox(height: 12),
              _ComposeField(
                  label: 'Message',
                  controller: bodyCtrl,
                  hint: 'Write your announcement…',
                  maxLines: 4),
              const SizedBox(height: 12),
              const Text('Send To',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary)),
              const SizedBox(height: 6),
              Obx(() => Wrap(
                    spacing: 8,
                    children: ['All', ...batches.map((b) => b.batchName)]
                        .map((name) {
                      final sel = selectedBatch.value == name;
                      return FilterChip(
                        label: Text(name),
                        selected: sel,
                        onSelected: (_) => selectedBatch.value = name,
                        selectedColor:
                            AppColors.primary.withValues(alpha: 0.15),
                        checkmarkColor: AppColors.primary,
                        labelStyle: TextStyle(
                          color: sel
                              ? AppColors.primary
                              : AppColors.textSecondary,
                          fontWeight: sel
                              ? FontWeight.w600
                              : FontWeight.normal,
                          fontSize: 12,
                        ),
                      );
                    }).toList(),
                  )),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () async {
                    if (titleCtrl.text.trim().isEmpty ||
                        bodyCtrl.text.trim().isEmpty) { return; }
                    Get.back();
                    await ctrl.sendAnnouncement(
                      title: titleCtrl.text.trim(),
                      body: bodyCtrl.text.trim(),
                      targetBatch: selectedBatch.value,
                    );
                  },
                  icon: const Icon(Icons.send_rounded, size: 18),
                  label: const Text('Send to Parents',
                      style:
                          TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
      isScrollControlled: true,
    );
  }
}

// ── Announcement card ─────────────────────────────────────────────────────────

class _AnnouncementCard extends StatelessWidget {
  const _AnnouncementCard({required this.ann});
  final Announcement ann;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.campaign_rounded,
                      color: AppColors.primary, size: 18),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(ann.title,
                          style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700)),
                      Text(
                        DateFormat('d MMM yyyy, HH:mm')
                            .format(ann.createdAt),
                        style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.approved.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: AppColors.approved.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    '${ann.sentTo} sent',
                    style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.approved,
                        fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(ann.body,
                style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    height: 1.5)),
            const SizedBox(height: 8),
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.navy.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'To: ${ann.targetBatch}',
                    style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.navy,
                        fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Compose field ─────────────────────────────────────────────────────────────

class _ComposeField extends StatelessWidget {
  const _ComposeField(
      {required this.label,
      required this.controller,
      required this.hint,
      this.maxLines = 1});
  final String label;
  final TextEditingController controller;
  final String hint;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          maxLines: maxLines,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(
                color: AppColors.textSecondary, fontSize: 13),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide:
                  const BorderSide(color: AppColors.primary, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
