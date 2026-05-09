import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../config/themes/app_theme.dart';
import '../controller/staff_controller.dart';
import '../model/staff_member.dart';

class OwnerStaffScreen extends StatelessWidget {
  const OwnerStaffScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.put(StaffController());

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: Obx(() => Text('Staff (${ctrl.staff.length})')),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          _SearchBar(ctrl: ctrl),
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
                      Icon(Icons.person_off_outlined,
                          size: 48, color: AppColors.border),
                      const SizedBox(height: 12),
                      const Text('No staff found',
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
                  itemBuilder: (_, i) => _StaffTile(
                    member: list[i],
                    onEdit: () =>
                        _showStaffSheet(context, ctrl, member: list[i]),
                    onDelete: () => _confirmRemove(context, ctrl, list[i]),
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
        label: const Text('Add Teacher'),
        onPressed: () => _showStaffSheet(context, ctrl),
      ),
    );
  }

  void _confirmRemove(
      BuildContext ctx, StaffController ctrl, StaffMember member) {
    showDialog(
      context: ctx,
      builder: (_) => AlertDialog(
        title: const Text('Remove Teacher'),
        content: Text('Remove ${member.name} from this center?'),
        actions: [
          TextButton(onPressed: () => Get.back(), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.rejected,
                foregroundColor: Colors.white),
            onPressed: () async {
              Get.back();
              await ctrl.deleteTeacher(member);
            },
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  void _showStaffSheet(BuildContext ctx, StaffController ctrl,
      {StaffMember? member}) {
    showModalBottomSheet(
      context: ctx,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _StaffFormSheet(ctrl: ctrl, member: member),
    );
  }
}

// ── Search bar ────────────────────────────────────────────────────────────────

class _SearchBar extends StatelessWidget {
  const _SearchBar({required this.ctrl});
  final StaffController ctrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: TextField(
        onChanged: (v) => ctrl.searchQuery.value = v,
        decoration: InputDecoration(
          hintText: 'Search by name, specialization...',
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
    );
  }
}

// ── Staff tile ────────────────────────────────────────────────────────────────

class _StaffTile extends StatelessWidget {
  const _StaffTile({
    required this.member,
    required this.onEdit,
    required this.onDelete,
  });

  final StaffMember member;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final initials = member.name
        .split(' ')
        .take(2)
        .map((w) => w.isNotEmpty ? w[0] : '')
        .join()
        .toUpperCase();

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
            radius: 24,
            backgroundColor: AppColors.navy.withValues(alpha: 0.12),
            backgroundImage: member.profileImageUrl != null
                ? NetworkImage(member.profileImageUrl!)
                : null,
            child: member.profileImageUrl == null
                ? Text(initials,
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.navy))
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
                      child: Text(member.name,
                          style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: member.isActive
                            ? AppColors.approved.withValues(alpha: 0.12)
                            : AppColors.border,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        member.isActive ? 'Active' : 'Inactive',
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: member.isActive
                                ? AppColors.approved
                                : AppColors.textSecondary),
                      ),
                    ),
                  ],
                ),
                if (member.specialization != null) ...[
                  const SizedBox(height: 3),
                  Text(member.specialization!,
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.textSecondary)),
                ],
                const SizedBox(height: 4),
                Row(
                  children: [
                    if (member.experienceYears > 0) ...[
                      const Icon(Icons.work_outline_rounded,
                          size: 11, color: AppColors.textSecondary),
                      const SizedBox(width: 3),
                      Text('${member.experienceYears} yrs exp',
                          style: const TextStyle(
                              fontSize: 11, color: AppColors.textSecondary)),
                      const SizedBox(width: 10),
                    ],
                    if (member.batchesCount > 0) ...[
                      const Icon(Icons.class_rounded,
                          size: 11, color: AppColors.textSecondary),
                      const SizedBox(width: 3),
                      Text('${member.batchesCount} batches',
                          style: const TextStyle(
                              fontSize: 11, color: AppColors.textSecondary)),
                    ],
                  ],
                ),
                if (member.email != null) ...[
                  const SizedBox(height: 3),
                  Text(member.email!,
                      style: const TextStyle(
                          fontSize: 11, color: AppColors.textSecondary)),
                ],
              ],
            ),
          ),
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'edit') onEdit();
              if (v == 'remove') onDelete();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'edit', child: Text('Edit')),
              PopupMenuItem(
                  value: 'remove',
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

// ── Staff form bottom sheet ───────────────────────────────────────────────────

class _StaffFormSheet extends StatefulWidget {
  const _StaffFormSheet({required this.ctrl, this.member});
  final StaffController ctrl;
  final StaffMember? member;

  @override
  State<_StaffFormSheet> createState() => _StaffFormSheetState();
}

class _StaffFormSheetState extends State<_StaffFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _mobile;
  late final TextEditingController _email;
  late final TextEditingController _specialization;
  late final TextEditingController _qualification;
  late final TextEditingController _experienceYears;

  bool _isActive = true;

  bool get _isEdit => widget.member != null;

  @override
  void initState() {
    super.initState();
    final m = widget.member;
    _name = TextEditingController(text: m?.name ?? '');
    _mobile = TextEditingController(text: m?.mobileNumber ?? '');
    _email = TextEditingController(text: m?.email ?? '');
    _specialization = TextEditingController(text: m?.specialization ?? '');
    _qualification = TextEditingController(text: m?.qualification ?? '');
    _experienceYears = TextEditingController(
        text: m?.experienceYears == 0 ? '' : '${m?.experienceYears ?? ''}');
    _isActive = m?.isActive ?? true;
  }

  @override
  void dispose() {
    _name.dispose();
    _mobile.dispose();
    _email.dispose();
    _specialization.dispose();
    _qualification.dispose();
    _experienceYears.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final payload = <String, dynamic>{
      'name': _name.text.trim(),
      'mobile_number': _mobile.text.trim(),
      'email': _email.text.trim().isEmpty ? null : _email.text.trim(),
      if (_specialization.text.trim().isNotEmpty)
        'specialization': _specialization.text.trim(),
      if (_qualification.text.trim().isNotEmpty)
        'qualification': _qualification.text.trim(),
      if (_experienceYears.text.trim().isNotEmpty)
        'experience_years': int.tryParse(_experienceYears.text.trim()) ?? 0,
      'is_active': _isActive,
    };

    bool ok;
    if (_isEdit) {
      ok = await widget.ctrl.updateTeacher(widget.member!.id, payload);
    } else {
      ok = await widget.ctrl.createTeacher(payload);
    }
    if (ok) {
      Get.back();
      Get.snackbar(
        _isEdit ? 'Updated' : 'Teacher Added',
        '${_name.text.trim()} has been ${_isEdit ? 'updated' : 'added'}',
        snackPosition: SnackPosition.BOTTOM,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.88,
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
              _SheetHandle(
                  title: _isEdit ? 'Edit Teacher' : 'Add Teacher'),
              Expanded(
                child: ListView(
                  controller: scrollCtrl,
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                  children: [
                    _FieldLabel('Full Name *'),
                    TextFormField(
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      decoration: _inputDeco('Enter teacher\'s full name'),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty)
                              ? 'Name is required'
                              : null,
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('Mobile Number *'),
                    TextFormField(
                      controller: _mobile,
                      keyboardType: TextInputType.phone,
                      decoration: _inputDeco('+91 XXXXX XXXXX'),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty)
                              ? 'Mobile is required'
                              : null,
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('Email'),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: _inputDeco('teacher@example.com'),
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('Specialization'),
                    TextFormField(
                      controller: _specialization,
                      textCapitalization: TextCapitalization.sentences,
                      decoration:
                          _inputDeco('e.g. Karate (Black belt 3rd Dan)'),
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('Qualification'),
                    TextFormField(
                      controller: _qualification,
                      textCapitalization: TextCapitalization.sentences,
                      decoration:
                          _inputDeco('e.g. B.A. in Music, RYT-500'),
                    ),
                    const SizedBox(height: 16),
                    _FieldLabel('Experience (Years)'),
                    TextFormField(
                      controller: _experienceYears,
                      keyboardType: TextInputType.number,
                      decoration: _inputDeco('e.g. 5'),
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
                            activeTrackColor:
                                AppColors.primary.withValues(alpha: 0.4),
                            onChanged: (v) =>
                                setState(() => _isActive = v),
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
                                : Text(_isEdit
                                    ? 'Save Changes'
                                    : 'Add Teacher'),
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

// ── Shared helpers ────────────────────────────────────────────────────────────

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
              borderRadius: BorderRadius.circular(2)),
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
