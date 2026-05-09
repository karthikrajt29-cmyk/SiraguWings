import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../../config/themes/app_theme.dart';
import '../../staff/model/staff_member.dart';
import '../controller/batches_controller.dart';
import '../model/owner_batch.dart';

class OwnerBatchesScreen extends StatelessWidget {
  const OwnerBatchesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.put(BatchesController());
    final moneyFmt =
        NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: Obx(() => Text('Batches (${ctrl.batches.length})')),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
      ),
      body: Obx(() {
        if (ctrl.loading.value) {
          return const Center(
              child: CircularProgressIndicator(color: AppColors.primary));
        }
        if (ctrl.batches.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.class_outlined, size: 48, color: AppColors.border),
                const SizedBox(height: 12),
                const Text('No batches yet',
                    style: TextStyle(color: AppColors.textSecondary)),
              ],
            ),
          );
        }
        return RefreshIndicator(
          color: AppColors.primary,
          onRefresh: ctrl.load,
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
            itemCount: ctrl.batches.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _BatchCard(
              batch: ctrl.batches[i],
              moneyFmt: moneyFmt,
              onEdit: () =>
                  _showBatchSheet(context, ctrl, batch: ctrl.batches[i]),
              onDelete: () => _confirmDelete(context, ctrl, ctrl.batches[i]),
            ),
          ),
        );
      }),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Add Batch'),
        onPressed: () => _showBatchSheet(context, ctrl),
      ),
    );
  }

  void _confirmDelete(
      BuildContext ctx, BatchesController ctrl, OwnerBatch batch) {
    showDialog(
      context: ctx,
      builder: (_) => AlertDialog(
        title: const Text('Delete Batch'),
        content: Text(
            'Delete "${batch.name}"? Students in this batch will become unassigned.'),
        actions: [
          TextButton(onPressed: () => Get.back(), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.rejected,
                foregroundColor: Colors.white),
            onPressed: () async {
              Get.back();
              await ctrl.deleteBatch(batch);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showBatchSheet(BuildContext ctx, BatchesController ctrl,
      {OwnerBatch? batch}) {
    showModalBottomSheet(
      context: ctx,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _BatchFormSheet(ctrl: ctrl, batch: batch),
    );
  }
}

// ── Batch card ────────────────────────────────────────────────────────────────

class _BatchCard extends StatelessWidget {
  const _BatchCard({
    required this.batch,
    required this.moneyFmt,
    required this.onEdit,
    required this.onDelete,
  });

  final OwnerBatch batch;
  final NumberFormat moneyFmt;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  static const _categoryColors = {
    'Sports': Color(0xFF3B82F6),
    'Dance': Color(0xFFEC4899),
    'Music': Color(0xFF8B5CF6),
    'Academic': Color(0xFF10B981),
    'Wellness': Color(0xFF14B8A6),
    'Arts': Color(0xFFF59E0B),
  };

  @override
  Widget build(BuildContext context) {
    final catColor = _categoryColors[batch.categoryType] ?? AppColors.accent;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: catColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.class_rounded, color: catColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(batch.name,
                        style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary)),
                    if (batch.courseName != null)
                      Text(batch.courseName!,
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.textSecondary)),
                  ],
                ),
              ),
              PopupMenuButton<String>(
                onSelected: (v) {
                  if (v == 'edit') onEdit();
                  if (v == 'delete') onDelete();
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(value: 'edit', child: Text('Edit')),
                  PopupMenuItem(
                    value: 'delete',
                    child: Text('Delete',
                        style: const TextStyle(color: AppColors.rejected)),
                  ),
                ],
                child: const Icon(Icons.more_vert,
                    size: 18, color: AppColors.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 12),
          Row(
            children: [
              _InfoItem(Icons.people_rounded, '${batch.studentCount} students'),
              if (batch.classDays != null) ...[
                const SizedBox(width: 14),
                Flexible(
                    child: _InfoItem(
                        Icons.calendar_today_rounded, batch.classDays!)),
              ],
              if (batch.timeDisplay != null) ...[
                const SizedBox(width: 14),
                _InfoItem(Icons.access_time_rounded, batch.timeDisplay!),
              ],
            ],
          ),
          if (batch.teacherName != null) ...[
            const SizedBox(height: 8),
            _InfoItem(Icons.person_rounded, batch.teacherName!),
          ],
          if (batch.monthlyFee != null) ...[
            const SizedBox(height: 8),
            _InfoItem(Icons.receipt_rounded,
                '${moneyFmt.format(batch.monthlyFee!)}/month'),
          ],
          if (batch.capacityCap != null) ...[
            const SizedBox(height: 10),
            _CapacityBar(batch: batch),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              _StatusBadge(active: batch.isActive),
              if (batch.categoryType != null) ...[
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: catColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(batch.categoryType!,
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: catColor)),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _CapacityBar extends StatelessWidget {
  const _CapacityBar({required this.batch});
  final OwnerBatch batch;

  @override
  Widget build(BuildContext context) {
    final pct = batch.capacityPct;
    final color = pct >= 0.9
        ? AppColors.rejected
        : pct >= 0.7
            ? AppColors.pending
            : AppColors.approved;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Capacity',
                style: const TextStyle(
                    fontSize: 11, color: AppColors.textSecondary)),
            Text('${batch.studentCount}/${batch.capacityCap}',
                style:
                    TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            backgroundColor: AppColors.border,
            valueColor: AlwaysStoppedAnimation(color),
            minHeight: 5,
          ),
        ),
      ],
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.active});
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: active
            ? AppColors.approved.withValues(alpha: 0.12)
            : AppColors.border,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(active ? 'Active' : 'Inactive',
          style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: active ? AppColors.approved : AppColors.textSecondary)),
    );
  }
}

class _InfoItem extends StatelessWidget {
  const _InfoItem(this.icon, this.text);
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Text(text,
            style: const TextStyle(
                fontSize: 12, color: AppColors.textSecondary)),
      ],
    );
  }
}

// ── Batch form bottom sheet ───────────────────────────────────────────────────

class _BatchFormSheet extends StatefulWidget {
  const _BatchFormSheet({required this.ctrl, this.batch});
  final BatchesController ctrl;
  final OwnerBatch? batch;

  @override
  State<_BatchFormSheet> createState() => _BatchFormSheetState();
}

class _BatchFormSheetState extends State<_BatchFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _courseName;
  late final TextEditingController _batchName;
  late final TextEditingController _monthlyFee;
  late final TextEditingController _capacityCap;

  String? _categoryType;
  Set<String> _selectedDays = {};
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;
  StaffMember? _selectedTeacher;
  bool _isActive = true;

  bool get _isEdit => widget.batch != null;

  static const _categories = [
    'Sports',
    'Dance',
    'Music',
    'Academic',
    'Wellness',
    'Arts',
  ];
  static const _weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  @override
  void initState() {
    super.initState();
    final b = widget.batch;
    _courseName = TextEditingController(text: b?.courseName ?? '');
    _batchName = TextEditingController(text: b?.name ?? '');
    _monthlyFee =
        TextEditingController(text: b?.monthlyFee?.toStringAsFixed(0) ?? '');
    _capacityCap = TextEditingController(
        text: b?.capacityCap?.toString() ?? '');
    _categoryType = b?.categoryType;
    _isActive = b?.isActive ?? true;

    if (b?.classDays != null) {
      _selectedDays =
          b!.classDays!.split(',').map((d) => d.trim()).toSet();
    }
    if (b?.startTime != null) {
      final parts = b!.startTime!.split(':');
      _startTime = TimeOfDay(
          hour: int.parse(parts[0]), minute: int.parse(parts[1]));
    }
    if (b?.endTime != null) {
      final parts = b!.endTime!.split(':');
      _endTime = TimeOfDay(
          hour: int.parse(parts[0]), minute: int.parse(parts[1]));
    }
    if (b?.teacherId != null) {
      _selectedTeacher = widget.ctrl.teachers
          .firstWhereOrNull((t) => t.id == b!.teacherId);
    }
  }

  @override
  void dispose() {
    _courseName.dispose();
    _batchName.dispose();
    _monthlyFee.dispose();
    _capacityCap.dispose();
    super.dispose();
  }

  String _fmtTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final payload = <String, dynamic>{
      'course_name': _courseName.text.trim().isEmpty
          ? null
          : _courseName.text.trim(),
      'batch_name': _batchName.text.trim(),
      if (_categoryType != null) 'category_type': _categoryType,
      if (_selectedDays.isNotEmpty)
        'class_days': _weekDays
            .where((d) => _selectedDays.contains(d))
            .join(', '),
      if (_startTime != null) 'start_time': _fmtTime(_startTime!),
      if (_endTime != null) 'end_time': _fmtTime(_endTime!),
      if (_monthlyFee.text.trim().isNotEmpty)
        'monthly_fee': double.tryParse(_monthlyFee.text.trim()),
      if (_capacityCap.text.trim().isNotEmpty)
        'capacity_cap': int.tryParse(_capacityCap.text.trim()),
      if (_selectedTeacher != null) 'teacher_id': _selectedTeacher!.id,
      if (_selectedTeacher != null) 'teacher_name': _selectedTeacher!.name,
      'is_active': _isActive,
    };

    bool ok;
    if (_isEdit) {
      ok = await widget.ctrl.updateBatch(widget.batch!.id, payload);
    } else {
      ok = await widget.ctrl.createBatch(payload);
    }
    if (ok) {
      Get.back();
      Get.snackbar(
        _isEdit ? 'Updated' : 'Batch Created',
        '${_batchName.text.trim()} has been ${_isEdit ? 'updated' : 'created'}',
        snackPosition: SnackPosition.BOTTOM,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              _SheetHandle(title: _isEdit ? 'Edit Batch' : 'Add Batch'),
              Expanded(
                child: ListView(
                  controller: scrollCtrl,
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                  children: [
                    _FieldLabel('Course Name'),
                    TextFormField(
                      controller: _courseName,
                      textCapitalization: TextCapitalization.words,
                      decoration: _inputDeco('e.g. Karate, Bharatanatyam'),
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('Batch Name *'),
                    TextFormField(
                      controller: _batchName,
                      textCapitalization: TextCapitalization.words,
                      decoration: _inputDeco('e.g. Beginners Karate'),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty)
                              ? 'Batch name is required'
                              : null,
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('Category'),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _categories.map((c) {
                        final sel = _categoryType == c;
                        return GestureDetector(
                          onTap: () => setState(
                              () => _categoryType = sel ? null : c),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 7),
                            decoration: BoxDecoration(
                              color: sel
                                  ? AppColors.primary
                                  : AppColors.primary
                                      .withValues(alpha: 0.07),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                  color: sel
                                      ? AppColors.primary
                                      : AppColors.border),
                            ),
                            child: Text(c,
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: sel
                                        ? Colors.white
                                        : AppColors.textPrimary)),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('Class Days'),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _weekDays.map((d) {
                        final sel = _selectedDays.contains(d);
                        return GestureDetector(
                          onTap: () => setState(() {
                            if (sel) {
                              _selectedDays.remove(d);
                            } else {
                              _selectedDays.add(d);
                            }
                          }),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 160),
                            width: 44,
                            height: 36,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: sel
                                  ? AppColors.primary
                                  : AppColors.surface,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                  color: sel
                                      ? AppColors.primary
                                      : AppColors.border),
                            ),
                            child: Text(d,
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: sel
                                        ? Colors.white
                                        : AppColors.textPrimary)),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _FieldLabel('Start Time'),
                              _TimePickerTile(
                                time: _startTime,
                                hint: 'Set time',
                                onPicked: (t) =>
                                    setState(() => _startTime = t),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _FieldLabel('End Time'),
                              _TimePickerTile(
                                time: _endTime,
                                hint: 'Set time',
                                onPicked: (t) =>
                                    setState(() => _endTime = t),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _FieldLabel('Monthly Fee (₹)'),
                              TextFormField(
                                controller: _monthlyFee,
                                keyboardType: TextInputType.number,
                                decoration: _inputDeco('e.g. 1500'),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _FieldLabel('Capacity Cap'),
                              TextFormField(
                                controller: _capacityCap,
                                keyboardType: TextInputType.number,
                                decoration: _inputDeco('Max students'),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('Assign Teacher'),
                    _DropdownField<StaffMember>(
                      value: _selectedTeacher,
                      hint: 'Select teacher',
                      items: widget.ctrl.teachers,
                      labelBuilder: (t) => t.name,
                      onChanged: (t) => setState(() => _selectedTeacher = t),
                    ),
                    if (_isEdit) ...[
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Active',
                              style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500)),
                          Switch(
                            value: _isActive,
                            activeThumbColor: AppColors.primary,
                            activeTrackColor: AppColors.primary.withValues(alpha: 0.4),
                            onChanged: (v) => setState(() => _isActive = v),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 28),
                    Obx(() => SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            onPressed:
                                widget.ctrl.saving.value ? null : _submit,
                            child: widget.ctrl.saving.value
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                        color: Colors.white, strokeWidth: 2))
                                : Text(_isEdit ? 'Save Changes' : 'Create Batch'),
                          ),
                        )),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TimePickerTile extends StatelessWidget {
  const _TimePickerTile(
      {required this.time, required this.hint, required this.onPicked});
  final TimeOfDay? time;
  final String hint;
  final ValueChanged<TimeOfDay> onPicked;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        final picked = await showTimePicker(
          context: context,
          initialTime: time ?? TimeOfDay.now(),
          builder: (ctx, child) => Theme(
            data: Theme.of(ctx).copyWith(
                colorScheme:
                    const ColorScheme.light(primary: AppColors.primary)),
            child: child!,
          ),
        );
        if (picked != null) onPicked(picked);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                time != null ? time!.format(context) : hint,
                style: TextStyle(
                    fontSize: 13,
                    color: time != null
                        ? AppColors.textPrimary
                        : AppColors.textSecondary),
              ),
            ),
            const Icon(Icons.access_time_rounded,
                size: 16, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }
}

// ── Shared helpers (re-declared for this file) ────────────────────────────────

class _SheetHandle extends StatelessWidget {
  const _SheetHandle({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 12),
        Container(
          width: 40,
          height: 4,
          decoration: BoxDecoration(
              color: AppColors.border, borderRadius: BorderRadius.circular(2)),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
          child: Row(
            children: [
              Expanded(
                  child: Text(title,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold))),
              IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Get.back()),
            ],
          ),
        ),
        const Divider(height: 1),
        const SizedBox(height: 12),
      ],
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary)),
      );
}

InputDecoration _inputDeco(String hint) => InputDecoration(
      hintText: hint,
      hintStyle:
          const TextStyle(fontSize: 13, color: AppColors.textSecondary),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border)),
      enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border)),
      focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary)),
    );

class _DropdownField<T> extends StatelessWidget {
  const _DropdownField({
    required this.value,
    required this.hint,
    required this.items,
    required this.labelBuilder,
    required this.onChanged,
  });

  final T? value;
  final String hint;
  final List<T> items;
  final String Function(T) labelBuilder;
  final ValueChanged<T?> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(12)),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          hint: Text(hint,
              style: const TextStyle(
                  fontSize: 13, color: AppColors.textSecondary)),
          isExpanded: true,
          items: items
              .map((item) => DropdownMenuItem<T>(
                    value: item,
                    child: Text(labelBuilder(item),
                        style: const TextStyle(fontSize: 13)),
                  ))
              .toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }
}
