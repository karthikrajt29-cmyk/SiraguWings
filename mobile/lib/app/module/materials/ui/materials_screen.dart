import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../config/themes/app_theme.dart';
import '../../auth/controller/auth_controller.dart';
import '../../teacher/batches/controller/teacher_batch_controller.dart';
import '../controller/material_controller.dart';
import '../model/material_model.dart';

class MaterialsScreen extends StatelessWidget {
  const MaterialsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<MaterialController>();
    final role = Get.find<AuthController>().currentRole.value;
    final isTeacher = role == 'Teacher';

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: ctrl.loadMaterials,
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
                          'Study Materials',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 12),
                        Obx(() {
                          final selected = ctrl.selectedType.value;
                          return _FilterChips(
                            selectedType: selected,
                            onSelect: (t) => ctrl.selectedType.value = t,
                          );
                        }),
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
              final items = ctrl.filtered;
              if (items.isEmpty) {
                return SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 80),
                    child: Column(
                      children: [
                        Icon(Icons.folder_open_rounded,
                            size: 48, color: AppColors.border),
                        const SizedBox(height: 12),
                        const Text('No materials found',
                            style: TextStyle(
                                color: AppColors.textSecondary, fontSize: 14)),
                      ],
                    ),
                  ),
                );
              }
              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (_, i) => _MaterialCard(
                    mat: items[i],
                    isTeacher: isTeacher,
                    onDelete: isTeacher
                        ? () => ctrl.deleteMaterial(items[i].id, items[i].title)
                        : null,
                  ),
                  childCount: items.length,
                ),
              );
            }),
            const SliverToBoxAdapter(child: SizedBox(height: 80)),
          ],
        ),
      ),
      floatingActionButton: isTeacher
          ? Obx(() => FloatingActionButton.extended(
                heroTag: 'upload_mat',
                backgroundColor: AppColors.primary,
                onPressed: ctrl.uploading.value
                    ? null
                    : () => _showUploadSheet(context, ctrl),
                icon: ctrl.uploading.value
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.upload_rounded, color: Colors.white),
                label: Text(
                  ctrl.uploading.value ? 'Uploading…' : 'Upload Material',
                  style: const TextStyle(color: Colors.white),
                ),
              ))
          : null,
    );
  }

  void _showUploadSheet(BuildContext context, MaterialController ctrl) {
    TeacherBatchController? batchCtrl;
    try {
      batchCtrl = Get.find<TeacherBatchController>();
    } catch (_) {}

    final batches = batchCtrl?.batches.toList() ?? [];
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final selectedBatchId = (batches.isNotEmpty ? batches.first.id : '').obs;
    final selectedBatchName =
        (batches.isNotEmpty ? batches.first.batchName : '').obs;
    final selectedType = 'pdf'.obs;

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
              const Text('Upload Material',
                  style:
                      TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              _SheetField(
                  label: 'Title', controller: titleCtrl, hint: 'e.g. Week 3 Notes'),
              const SizedBox(height: 12),
              _SheetField(
                  label: 'Description',
                  controller: descCtrl,
                  hint: 'Brief description',
                  maxLines: 2),
              const SizedBox(height: 12),
              if (batches.isNotEmpty) ...[
                const Text('Batch',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary)),
                const SizedBox(height: 6),
                Obx(() => DropdownButtonFormField<String>(
                      initialValue: selectedBatchId.value,
                      decoration: _inputDeco(),
                      items: batches
                          .map((b) => DropdownMenuItem(
                              value: b.id, child: Text(b.batchName)))
                          .toList(),
                      onChanged: (v) {
                        if (v == null) return;
                        selectedBatchId.value = v;
                        selectedBatchName.value = batches
                            .firstWhere((b) => b.id == v)
                            .batchName;
                      },
                    )),
                const SizedBox(height: 12),
              ],
              const Text('Type',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary)),
              const SizedBox(height: 6),
              Obx(() => Wrap(
                    spacing: 8,
                    children: ['pdf', 'note', 'assignment'].map((t) {
                      final selected = selectedType.value == t;
                      return FilterChip(
                        label: Text(t[0].toUpperCase() + t.substring(1)),
                        selected: selected,
                        onSelected: (_) => selectedType.value = t,
                        selectedColor: AppColors.primary.withValues(alpha: 0.15),
                        checkmarkColor: AppColors.primary,
                        labelStyle: TextStyle(
                          color: selected
                              ? AppColors.primary
                              : AppColors.textSecondary,
                          fontWeight: selected
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                      );
                    }).toList(),
                  )),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () async {
                    if (titleCtrl.text.trim().isEmpty) return;
                    Get.back();
                    await ctrl.uploadMaterial(
                      title: titleCtrl.text.trim(),
                      description: descCtrl.text.trim().isEmpty
                          ? titleCtrl.text.trim()
                          : descCtrl.text.trim(),
                      batchId: selectedBatchId.value,
                      batchName: selectedBatchName.value,
                      type: selectedType.value,
                    );
                  },
                  child: const Text('Upload',
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

  InputDecoration _inputDeco() => InputDecoration(
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
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      );
}

// ── Filter chips ──────────────────────────────────────────────────────────────

class _FilterChips extends StatelessWidget {
  const _FilterChips({required this.selectedType, required this.onSelect});
  final String selectedType;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    const types = ['All', 'Pdf', 'Note', 'Assignment'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: types.map((t) {
          final selected = selectedType == t;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => onSelect(t),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: selected
                      ? Colors.white
                      : Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: selected ? Colors.white : Colors.white30,
                  ),
                ),
                child: Text(
                  t,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: selected ? AppColors.navy : Colors.white70,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ── Material card ─────────────────────────────────────────────────────────────

class _MaterialCard extends StatelessWidget {
  const _MaterialCard(
      {required this.mat, required this.isTeacher, this.onDelete});
  final CourseMaterial mat;
  final bool isTeacher;
  final VoidCallback? onDelete;

  IconData get _icon {
    switch (mat.type) {
      case 'assignment':
        return Icons.assignment_rounded;
      case 'note':
        return Icons.sticky_note_2_rounded;
      default:
        return Icons.picture_as_pdf_rounded;
    }
  }

  Color get _color {
    switch (mat.type) {
      case 'assignment':
        return AppColors.pending;
      case 'note':
        return AppColors.accent;
      default:
        return AppColors.rejected;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDueNear = mat.dueDate != null &&
        DateTime.parse(mat.dueDate!).difference(DateTime.now()).inDays <= 7;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDueNear
              ? AppColors.pending.withValues(alpha: 0.5)
              : AppColors.border,
        ),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: _color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(_icon, color: _color, size: 22),
        ),
        title: Text(mat.title,
            style:
                const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 2),
            Text(mat.description,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 11, color: AppColors.textSecondary)),
            const SizedBox(height: 4),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(mat.batchName,
                      style: const TextStyle(
                          fontSize: 10,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w500)),
                ),
                Text(
                  DateFormat('d MMM').format(mat.uploadedAt),
                  style: const TextStyle(
                      fontSize: 10, color: AppColors.textSecondary),
                ),
                if (mat.dueDate != null)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.schedule_rounded,
                          size: 10,
                          color: isDueNear
                              ? AppColors.pending
                              : AppColors.textSecondary),
                      const SizedBox(width: 2),
                      Text(
                        'Due ${DateFormat('d MMM').format(DateTime.parse(mat.dueDate!))}',
                        style: TextStyle(
                            fontSize: 10,
                            color: isDueNear
                                ? AppColors.pending
                                : AppColors.textSecondary,
                            fontWeight: isDueNear
                                ? FontWeight.w600
                                : FontWeight.normal),
                      ),
                    ],
                  ),
              ],
            ),
          ],
        ),
        trailing: isTeacher
            ? PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert_rounded,
                    size: 18, color: AppColors.textSecondary),
                onSelected: (v) {
                  if (v == 'delete' && onDelete != null) onDelete!();
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete_outline_rounded,
                            size: 18, color: AppColors.rejected),
                        SizedBox(width: 8),
                        Text('Delete',
                            style:
                                TextStyle(color: AppColors.rejected)),
                      ],
                    ),
                  ),
                ],
              )
            : IconButton(
                icon: const Icon(Icons.download_rounded,
                    size: 18, color: AppColors.primary),
                onPressed: () => Get.snackbar(
                  'Download',
                  '${mat.fileName ?? mat.title} will be available once connected.',
                  snackPosition: SnackPosition.BOTTOM,
                ),
              ),
      ),
    );
  }
}

// ── Sheet helpers ─────────────────────────────────────────────────────────────

class _SheetField extends StatelessWidget {
  const _SheetField(
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
