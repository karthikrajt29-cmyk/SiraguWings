import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../../config/themes/app_theme.dart';
import '../../batches/model/owner_batch.dart';
import '../../parents/model/parent_summary.dart';
import '../controller/students_controller.dart';
import '../model/owner_student.dart';

class OwnerStudentsScreen extends StatelessWidget {
  const OwnerStudentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.put(StudentsController());

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: Obx(() => Text('Students (${ctrl.students.length})')),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          _SearchAndFilter(ctrl: ctrl),
          Expanded(
            child: Obx(() {
              if (ctrl.loading.value) {
                return const Center(
                    child: CircularProgressIndicator(color: AppColors.primary));
              }
              final list = ctrl.filtered;
              if (list.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.people_outline,
                          size: 48, color: AppColors.border),
                      const SizedBox(height: 12),
                      const Text('No students found',
                          style: TextStyle(color: AppColors.textSecondary)),
                    ],
                  ),
                );
              }
              return RefreshIndicator(
                color: AppColors.primary,
                onRefresh: ctrl.load,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _StudentTile(
                    student: list[i],
                    onEdit: () =>
                        _showStudentSheet(context, ctrl, student: list[i]),
                    onDelete: () => _confirmDelete(context, ctrl, list[i]),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add_rounded),
        label: const Text('Add Student'),
        onPressed: () => _showStudentSheet(context, ctrl),
      ),
    );
  }

  void _confirmDelete(
      BuildContext ctx, StudentsController ctrl, OwnerStudent student) {
    showDialog(
      context: ctx,
      builder: (_) => AlertDialog(
        title: const Text('Remove Student'),
        content: Text(
            'Remove ${student.name} from this center? This cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Get.back(),
              child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.rejected,
                foregroundColor: Colors.white),
            onPressed: () async {
              Get.back();
              await ctrl.deleteStudent(student);
            },
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  void _showStudentSheet(BuildContext ctx, StudentsController ctrl,
      {OwnerStudent? student}) {
    showModalBottomSheet(
      context: ctx,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _StudentFormSheet(ctrl: ctrl, student: student),
    );
  }
}

// ── Search + Gender filter ────────────────────────────────────────────────────

class _SearchAndFilter extends StatelessWidget {
  const _SearchAndFilter({required this.ctrl});
  final StudentsController ctrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        children: [
          TextField(
            onChanged: (v) => ctrl.searchQuery.value = v,
            decoration: InputDecoration(
              hintText: 'Search by name, batch or parent...',
              prefixIcon: const Icon(Icons.search, size: 20),
              contentPadding: const EdgeInsets.symmetric(vertical: 0),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border)),
              enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border)),
            ),
          ),
          const SizedBox(height: 10),
          Obx(() {
            final current = ctrl.genderFilter.value;
            return Row(
              children: ['All', 'Male', 'Female'].map((g) {
                final selected = current == g;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () => ctrl.genderFilter.value = g,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: selected
                            ? AppColors.primary
                            : AppColors.primary.withValues(alpha: 0.07),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(g,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: selected
                                ? Colors.white
                                : AppColors.primary,
                          )),
                    ),
                  ),
                );
              }).toList(),
            );
          }),
        ],
      ),
    );
  }
}

// ── Student tile ──────────────────────────────────────────────────────────────

class _StudentTile extends StatelessWidget {
  const _StudentTile({
    required this.student,
    required this.onEdit,
    required this.onDelete,
  });

  final OwnerStudent student;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final initials = student.name
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0] : '')
        .join()
        .toUpperCase();

    final isActive = student.status == 'Active';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.primary.withValues(alpha: 0.12),
            backgroundImage: student.profileImageUrl != null
                ? NetworkImage(student.profileImageUrl!)
                : null,
            child: student.profileImageUrl == null
                ? Text(initials,
                    style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary))
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(student.name,
                          style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary)),
                    ),
                    _StatusChip(isActive: isActive, status: student.status),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    if (student.batchName != null) ...[
                      const Icon(Icons.class_rounded,
                          size: 11, color: AppColors.textSecondary),
                      const SizedBox(width: 3),
                      Text(student.batchName!,
                          style: const TextStyle(
                              fontSize: 11, color: AppColors.textSecondary)),
                      const SizedBox(width: 10),
                    ],
                    if (student.parentName != null) ...[
                      const Icon(Icons.person_outline,
                          size: 11, color: AppColors.textSecondary),
                      const SizedBox(width: 3),
                      Flexible(
                        child: Text(student.parentName!,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 11, color: AppColors.textSecondary)),
                      ),
                    ],
                  ],
                ),
                if (student.gender != null || student.grade != null) ...[
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      if (student.gender != null)
                        Text(student.gender!,
                            style: const TextStyle(
                                fontSize: 10, color: AppColors.textSecondary)),
                      if (student.gender != null && student.grade != null)
                        const Text(' · ',
                            style: TextStyle(
                                fontSize: 10, color: AppColors.textSecondary)),
                      if (student.grade != null)
                        Text('Grade ${student.grade}',
                            style: const TextStyle(
                                fontSize: 10, color: AppColors.textSecondary)),
                    ],
                  ),
                ],
              ],
            ),
          ),
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'edit') onEdit();
              if (v == 'delete') onDelete();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'edit', child: Text('Edit')),
              PopupMenuItem(
                  value: 'delete',
                  child: Text('Remove',
                      style: TextStyle(color: AppColors.rejected))),
            ],
            child: const Icon(Icons.more_vert,
                size: 18, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.isActive, required this.status});
  final bool isActive;
  final String status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: isActive
            ? AppColors.approved.withValues(alpha: 0.12)
            : AppColors.border,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(status,
          style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: isActive ? AppColors.approved : AppColors.textSecondary)),
    );
  }
}

// ── Student form bottom sheet ─────────────────────────────────────────────────

class _StudentFormSheet extends StatefulWidget {
  const _StudentFormSheet({required this.ctrl, this.student});
  final StudentsController ctrl;
  final OwnerStudent? student;

  @override
  State<_StudentFormSheet> createState() => _StudentFormSheetState();
}

class _StudentFormSheetState extends State<_StudentFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _grade;
  late final TextEditingController _school;
  late final TextEditingController _medicalNotes;

  String? _gender;
  String? _bloodGroup;
  DateTime? _dob;
  DateTime? _joinedDate;
  ParentSummary? _selectedParent;
  OwnerBatch? _selectedBatch;

  bool get _isEdit => widget.student != null;

  static const _bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  @override
  void initState() {
    super.initState();
    final s = widget.student;
    _name = TextEditingController(text: s?.name ?? '');
    _grade = TextEditingController(text: s?.grade ?? '');
    _school = TextEditingController(text: s?.school ?? '');
    _medicalNotes = TextEditingController(text: s?.medicalNotes ?? '');
    _gender = s?.gender;
    _bloodGroup = s?.bloodGroup;
    _dob = _parseDate(s?.dateOfBirth);
    _joinedDate = _parseDate(s?.joinedDate);

    if (s?.parentId != null) {
      _selectedParent = widget.ctrl.parents
          .firstWhereOrNull((p) => p.id == s!.parentId);
    }
    if (s?.batchId != null) {
      _selectedBatch = widget.ctrl.batches
          .firstWhereOrNull((b) => b.id == s!.batchId);
    }
  }

  DateTime? _parseDate(String? d) {
    if (d == null || d.isEmpty) return null;
    try {
      return DateTime.parse(d);
    } catch (_) {
      return null;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _grade.dispose();
    _school.dispose();
    _medicalNotes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_gender == null) {
      Get.snackbar('Required', 'Please select gender.',
          snackPosition: SnackPosition.BOTTOM);
      return;
    }

    final payload = {
      'name': _name.text.trim(),
      'gender': _gender,
      if (_bloodGroup != null) 'blood_group': _bloodGroup,
      if (_dob != null) 'date_of_birth': _dob!.toIso8601String().substring(0, 10),
      if (_grade.text.trim().isNotEmpty) 'grade': _grade.text.trim(),
      if (_school.text.trim().isNotEmpty) 'school': _school.text.trim(),
      if (_medicalNotes.text.trim().isNotEmpty)
        'medical_notes': _medicalNotes.text.trim(),
      if (_selectedBatch != null) 'batch_id': _selectedBatch!.id,
      if (_selectedBatch != null) 'batch_name': _selectedBatch!.name,
      if (_selectedParent != null) 'parent_id': _selectedParent!.id,
      if (_selectedParent != null) 'parent_name': _selectedParent!.name,
      if (_selectedParent != null) 'parent_mobile': _selectedParent!.mobileNumber,
      if (_joinedDate != null)
        'joined_date': _joinedDate!.toIso8601String().substring(0, 10),
    };

    bool ok;
    if (_isEdit) {
      ok = await widget.ctrl.updateStudent(widget.student!.id, payload);
    } else {
      ok = await widget.ctrl.createStudent(payload);
    }
    if (ok) {
      Get.back();
      Get.snackbar(
        _isEdit ? 'Updated' : 'Student Added',
        _isEdit
            ? '${_name.text.trim()} has been updated'
            : '${_name.text.trim()} has been added',
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
              _SheetHandle(title: _isEdit ? 'Edit Student' : 'Add Student'),
              Expanded(
                child: ListView(
                  controller: scrollCtrl,
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                  children: [
                    _SectionLabel('Basic Information'),
                    _FieldLabel('Full Name *'),
                    TextFormField(
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      decoration: _inputDeco('Enter student\'s full name'),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty) ? 'Name is required' : null,
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('Gender *'),
                    _GenderPicker(
                      selected: _gender,
                      onChanged: (g) => setState(() => _gender = g),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _FieldLabel('Date of Birth'),
                              _DatePickerTile(
                                date: _dob,
                                hint: 'Select DOB',
                                lastDate: DateTime.now(),
                                onPicked: (d) => setState(() => _dob = d),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _FieldLabel('Blood Group'),
                              _DropdownField<String>(
                                value: _bloodGroup,
                                hint: 'Select',
                                items: _bloodGroups,
                                labelBuilder: (v) => v,
                                onChanged: (v) =>
                                    setState(() => _bloodGroup = v),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('Grade / Class'),
                    TextFormField(
                      controller: _grade,
                      decoration: _inputDeco('e.g. 5th, Class 8'),
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('School'),
                    TextFormField(
                      controller: _school,
                      textCapitalization: TextCapitalization.words,
                      decoration: _inputDeco('Enter school name'),
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('Medical Notes'),
                    TextFormField(
                      controller: _medicalNotes,
                      maxLines: 3,
                      decoration: _inputDeco('Any allergies or medical conditions...'),
                    ),
                    const SizedBox(height: 24),
                    _SectionLabel('Enrollment Details'),
                    _FieldLabel('Parent'),
                    _ParentPickerTile(
                      selected: _selectedParent,
                      parents: widget.ctrl.parents,
                      onPicked: (p) => setState(() => _selectedParent = p),
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('Batch'),
                    _DropdownField<OwnerBatch>(
                      value: _selectedBatch,
                      hint: 'Select batch',
                      items: widget.ctrl.batches,
                      labelBuilder: (b) => b.name,
                      onChanged: (b) => setState(() => _selectedBatch = b),
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('Date of Join'),
                    _DatePickerTile(
                      date: _joinedDate,
                      hint: 'Select joining date',
                      lastDate: DateTime.now(),
                      onPicked: (d) => setState(() => _joinedDate = d),
                    ),
                    const SizedBox(height: 28),
                    Obx(() => SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            onPressed: widget.ctrl.saving.value ? null : _submit,
                            child: widget.ctrl.saving.value
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                        color: Colors.white, strokeWidth: 2))
                                : Text(_isEdit ? 'Save Changes' : 'Add Student'),
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

// ── Parent picker tile ────────────────────────────────────────────────────────

class _ParentPickerTile extends StatelessWidget {
  const _ParentPickerTile({
    required this.selected,
    required this.parents,
    required this.onPicked,
  });

  final ParentSummary? selected;
  final List<ParentSummary> parents;
  final ValueChanged<ParentSummary?> onPicked;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showPicker(context),
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
                selected?.name ?? 'Search & select parent',
                style: TextStyle(
                  fontSize: 14,
                  color: selected != null
                      ? AppColors.textPrimary
                      : AppColors.textSecondary,
                ),
              ),
            ),
            if (selected != null)
              GestureDetector(
                onTap: () => onPicked(null),
                child: const Icon(Icons.clear,
                    size: 18, color: AppColors.textSecondary),
              )
            else
              const Icon(Icons.search, size: 18, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }

  void _showPicker(BuildContext ctx) {
    showDialog(
      context: ctx,
      builder: (_) => _ParentPickerDialog(
        parents: parents,
        onPicked: onPicked,
      ),
    );
  }
}

class _ParentPickerDialog extends StatefulWidget {
  const _ParentPickerDialog({required this.parents, required this.onPicked});
  final List<ParentSummary> parents;
  final ValueChanged<ParentSummary?> onPicked;

  @override
  State<_ParentPickerDialog> createState() => _ParentPickerDialogState();
}

class _ParentPickerDialogState extends State<_ParentPickerDialog> {
  String _query = '';

  List<ParentSummary> get _filtered {
    if (_query.isEmpty) return widget.parents;
    final q = _query.toLowerCase();
    return widget.parents
        .where((p) =>
            p.name.toLowerCase().contains(q) ||
            (p.mobileNumber?.contains(q) ?? false))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: SizedBox(
        height: 420,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                children: [
                  const Expanded(
                    child: Text('Select Parent',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                  IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Get.back()),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                autofocus: true,
                onChanged: (v) => setState(() => _query = v),
                decoration: InputDecoration(
                  hintText: 'Search by name or mobile',
                  prefixIcon: const Icon(Icons.search, size: 20),
                  contentPadding: const EdgeInsets.symmetric(vertical: 0),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border)),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border)),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                itemCount: _filtered.length,
                separatorBuilder: (_, __) =>
                    const Divider(height: 1, indent: 56),
                itemBuilder: (_, i) {
                  final p = _filtered[i];
                  return ListTile(
                    leading: CircleAvatar(
                      radius: 18,
                      backgroundColor: AppColors.navy.withValues(alpha: 0.1),
                      child: Text(
                        p.name.isNotEmpty ? p.name[0].toUpperCase() : 'P',
                        style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppColors.navy),
                      ),
                    ),
                    title: Text(p.name,
                        style: const TextStyle(fontSize: 14)),
                    subtitle: Text(p.mobileNumber ?? '',
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textSecondary)),
                    onTap: () {
                      widget.onPicked(p);
                      Get.back();
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Shared form helpers ───────────────────────────────────────────────────────

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
            color: AppColors.border,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
          child: Row(
            children: [
              Expanded(
                child: Text(title,
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.bold)),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Get.back(),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        const SizedBox(height: 12),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(text.toUpperCase(),
          style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: AppColors.textSecondary,
              letterSpacing: 0.8)),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text,
          style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary)),
    );
  }
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

class _GenderPicker extends StatelessWidget {
  const _GenderPicker({required this.selected, required this.onChanged});
  final String? selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: ['Male', 'Female', 'Other'].map((g) {
        final sel = selected == g;
        return Padding(
          padding: const EdgeInsets.only(right: 10),
          child: GestureDetector(
            onTap: () => onChanged(g),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: sel
                    ? AppColors.primary
                    : AppColors.primary.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: sel
                        ? AppColors.primary
                        : AppColors.border),
              ),
              child: Text(g,
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: sel ? Colors.white : AppColors.textPrimary)),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _DatePickerTile extends StatelessWidget {
  const _DatePickerTile({
    required this.date,
    required this.hint,
    required this.lastDate,
    required this.onPicked,
  });

  final DateTime? date;
  final String hint;
  final DateTime lastDate;
  final ValueChanged<DateTime> onPicked;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: date ?? DateTime.now(),
          firstDate: DateTime(1990),
          lastDate: lastDate,
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
        padding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                date != null
                    ? DateFormat('dd MMM yyyy').format(date!)
                    : hint,
                style: TextStyle(
                  fontSize: 13,
                  color: date != null
                      ? AppColors.textPrimary
                      : AppColors.textSecondary,
                ),
              ),
            ),
            const Icon(Icons.calendar_today_rounded,
                size: 16, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }
}

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
        borderRadius: BorderRadius.circular(12),
      ),
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
