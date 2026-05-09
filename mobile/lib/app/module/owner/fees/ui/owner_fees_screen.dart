import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../../config/themes/app_theme.dart';
import '../../batches/model/owner_batch.dart';
import '../../students/model/owner_student.dart';
import '../controller/fees_controller.dart';
import '../model/fee_invoice.dart';

class OwnerFeesScreen extends StatelessWidget {
  const OwnerFeesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.put(OwnerFeesController());
    final fmt =
        NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Fee Management'),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
      ),
      body: Obx(() {
        if (ctrl.loading.value) {
          return const Center(
              child: CircularProgressIndicator(color: AppColors.primary));
        }
        return Column(
          children: [
            _SummaryHeader(ctrl: ctrl, fmt: fmt),
            if (ctrl.overdueCount > 0) _OverdueBanner(ctrl: ctrl, fmt: fmt),
            _SearchBar(ctrl: ctrl),
            _FilterTabBar(ctrl: ctrl),
            Expanded(child: _TabContent(ctrl: ctrl, fmt: fmt)),
          ],
        );
      }),
      floatingActionButton: _FeesFab(),
    );
  }
}

// ── FAB with menu ─────────────────────────────────────────────────────────────

class _FeesFab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final ctrl = Get.find<OwnerFeesController>();
    return PopupMenuButton<String>(
      tooltip: '',
      offset: const Offset(0, -120),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      itemBuilder: (_) => const [
        PopupMenuItem(
          value: 'create',
          child: Row(children: [
            Icon(Icons.receipt_long_rounded, size: 18, color: AppColors.primary),
            SizedBox(width: 10),
            Text('Create Fee'),
          ]),
        ),
        PopupMenuItem(
          value: 'bulk',
          child: Row(children: [
            Icon(Icons.group_add_rounded, size: 18, color: AppColors.accent),
            SizedBox(width: 10),
            Text('Bulk Bill Batch'),
          ]),
        ),
      ],
      onSelected: (v) {
        if (v == 'create') {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (_) => _CreateFeeSheet(ctrl: ctrl),
          );
        } else if (v == 'bulk') {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (_) => _BulkBillSheet(ctrl: ctrl),
          );
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.add, color: Colors.white),
            SizedBox(width: 6),
            Text('New Fee',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

// ── Summary header ────────────────────────────────────────────────────────────

class _SummaryHeader extends StatelessWidget {
  const _SummaryHeader({required this.ctrl, required this.fmt});
  final OwnerFeesController ctrl;
  final NumberFormat fmt;

  @override
  Widget build(BuildContext context) {
    final total = ctrl.totalBilled;
    final collected = ctrl.collectedThisMonth;
    final pct = total > 0 ? (collected / total).clamp(0.0, 1.0) : 0.0;

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                  child: _KpiTile(
                label: 'Billed',
                value: fmt.format(total),
                color: AppColors.textPrimary,
                icon: Icons.receipt_rounded,
              )),
              const SizedBox(width: 10),
              Expanded(
                  child: _KpiTile(
                label: 'Collected',
                value: fmt.format(collected),
                color: AppColors.approved,
                icon: Icons.check_circle_outline_rounded,
              )),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                  child: _KpiTile(
                label: 'Outstanding',
                value: fmt.format(ctrl.outstanding),
                color: AppColors.pending,
                icon: Icons.pending_actions_rounded,
              )),
              const SizedBox(width: 10),
              Expanded(
                  child: _KpiTile(
                label: 'Overdue',
                value: fmt.format(ctrl.overdueAmount),
                color: AppColors.rejected,
                icon: Icons.warning_amber_rounded,
              )),
            ],
          ),
          const SizedBox(height: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Collection progress',
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textSecondary)),
                  Text('${(pct * 100).toStringAsFixed(0)}%',
                      style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.approved)),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: pct,
                  backgroundColor: AppColors.border,
                  valueColor:
                      const AlwaysStoppedAnimation(AppColors.approved),
                  minHeight: 7,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _KpiTile extends StatelessWidget {
  const _KpiTile({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value,
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: color)),
                Text(label,
                    style: const TextStyle(
                        fontSize: 10, color: AppColors.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Overdue banner ────────────────────────────────────────────────────────────

class _OverdueBanner extends StatelessWidget {
  const _OverdueBanner({required this.ctrl, required this.fmt});
  final OwnerFeesController ctrl;
  final NumberFormat fmt;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.rejected.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.rejected.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_rounded,
              color: AppColors.rejected, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                    '${ctrl.overdueCount} overdue ${ctrl.overdueCount == 1 ? 'fee' : 'fees'}',
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.rejected)),
                Text('${fmt.format(ctrl.overdueAmount)} pending collection',
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textSecondary)),
              ],
            ),
          ),
          GestureDetector(
            onTap: () => ctrl.tabIndex.value = 2,
            child: const Text('View',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.rejected)),
          ),
        ],
      ),
    );
  }
}

// ── Search bar ────────────────────────────────────────────────────────────────

class _SearchBar extends StatelessWidget {
  const _SearchBar({required this.ctrl});
  final OwnerFeesController ctrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: TextField(
        onChanged: (v) => ctrl.searchQuery.value = v,
        decoration: InputDecoration(
          hintText: 'Search by student, batch, period...',
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

// ── Filter tab bar ────────────────────────────────────────────────────────────

class _FilterTabBar extends StatelessWidget {
  const _FilterTabBar({required this.ctrl});
  final OwnerFeesController ctrl;

  @override
  Widget build(BuildContext context) {
    final tabs = [
      ('Pending', ctrl.pendingCount),
      ('Paid', ctrl.paidCount),
      ('Overdue', ctrl.overdueCount),
    ];
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
      child: Obx(() => Row(
            children: List.generate(tabs.length, (i) {
              final selected = ctrl.tabIndex.value == i;
              final (label, count) = tabs[i];
              return Padding(
                padding: EdgeInsets.only(right: i < tabs.length - 1 ? 8 : 0),
                child: GestureDetector(
                  onTap: () => ctrl.tabIndex.value = i,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: selected
                          ? AppColors.primary
                          : AppColors.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(label,
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: selected
                                    ? Colors.white
                                    : AppColors.primary)),
                        const SizedBox(width: 5),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                            color: selected
                                ? Colors.white.withValues(alpha: 0.25)
                                : AppColors.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text('$count',
                              style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: selected
                                      ? Colors.white
                                      : AppColors.primary)),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          )),
    );
  }
}

// ── Tab content ───────────────────────────────────────────────────────────────

class _TabContent extends StatelessWidget {
  const _TabContent({required this.ctrl, required this.fmt});
  final OwnerFeesController ctrl;
  final NumberFormat fmt;

  List<FeeInvoice> get _current {
    switch (ctrl.tabIndex.value) {
      case 1:
        return ctrl.paid;
      case 2:
        return ctrl.overdue;
      default:
        return ctrl.pending;
    }
  }

  @override
  Widget build(BuildContext context) {
    final list = _current;
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.receipt_long_outlined, size: 48, color: AppColors.border),
            const SizedBox(height: 12),
            Text(
              'No ${['pending', 'paid', 'overdue'][ctrl.tabIndex.value]} fees',
              style: const TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: ctrl.load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        itemCount: list.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _FeeRow(
          invoice: list[i],
          ctrl: ctrl,
          fmt: fmt,
          onRecordPayment: () =>
              _showRecordPaymentSheet(context, ctrl, list[i]),
          onSendReminder: () => _confirmReminder(context, ctrl, list[i]),
          onEdit: () => _showEditFeeSheet(context, ctrl, list[i]),
          onViewInvoice: () => _showInvoice(context, list[i], fmt),
        ),
      ),
    );
  }

  void _showRecordPaymentSheet(
      BuildContext ctx, OwnerFeesController ctrl, FeeInvoice invoice) {
    showModalBottomSheet(
      context: ctx,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RecordPaymentSheet(invoice: invoice, ctrl: ctrl),
    );
  }

  void _showEditFeeSheet(
      BuildContext ctx, OwnerFeesController ctrl, FeeInvoice invoice) {
    showModalBottomSheet(
      context: ctx,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _EditFeeSheet(invoice: invoice, ctrl: ctrl),
    );
  }

  void _confirmReminder(
      BuildContext ctx, OwnerFeesController ctrl, FeeInvoice invoice) {
    showDialog(
      context: ctx,
      builder: (_) => AlertDialog(
        title: const Text('Send Fee Reminder'),
        content: Text(
            'Send a payment reminder for ${invoice.studentName}? A notification will be pushed to their parent.'),
        actions: [
          TextButton(onPressed: () => Get.back(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Get.back();
              final ok = await ctrl.sendReminder(invoice);
              if (ok) {
                Get.snackbar('Reminder Sent',
                    'Notified parent of ${invoice.studentName}',
                    snackPosition: SnackPosition.BOTTOM);
              }
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }

  void _showInvoice(
      BuildContext ctx, FeeInvoice invoice, NumberFormat fmt) {
    showModalBottomSheet(
      context: ctx,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _InvoicePreview(invoice: invoice, fmt: fmt),
    );
  }
}

// ── Fee row ───────────────────────────────────────────────────────────────────

class _FeeRow extends StatelessWidget {
  const _FeeRow({
    required this.invoice,
    required this.ctrl,
    required this.fmt,
    required this.onRecordPayment,
    required this.onSendReminder,
    required this.onEdit,
    required this.onViewInvoice,
  });

  final FeeInvoice invoice;
  final OwnerFeesController ctrl;
  final NumberFormat fmt;
  final VoidCallback onRecordPayment;
  final VoidCallback onSendReminder;
  final VoidCallback onEdit;
  final VoidCallback onViewInvoice;

  Color get _statusColor {
    if (invoice.isPaid) return AppColors.approved;
    if (invoice.isOverdue) return AppColors.rejected;
    return AppColors.pending;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: invoice.isOverdue
                ? AppColors.rejected.withValues(alpha: 0.3)
                : AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(invoice.studentName,
                        style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary)),
                    if (invoice.batchName != null) ...[
                      const SizedBox(height: 2),
                      Text(invoice.batchName!,
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.textSecondary)),
                    ],
                  ],
                ),
              ),
              Text(fmt.format(invoice.amount),
                  style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary)),
              PopupMenuButton<String>(
                padding: EdgeInsets.zero,
                tooltip: '',
                onSelected: (v) {
                  switch (v) {
                    case 'record':
                      onRecordPayment();
                      break;
                    case 'reminder':
                      onSendReminder();
                      break;
                    case 'edit':
                      onEdit();
                      break;
                    case 'invoice':
                      onViewInvoice();
                      break;
                  }
                },
                itemBuilder: (_) => [
                  if (!invoice.isPaid)
                    const PopupMenuItem(
                        value: 'record', child: Text('Record Payment')),
                  if (!invoice.isPaid)
                    const PopupMenuItem(
                        value: 'reminder', child: Text('Send Reminder')),
                  const PopupMenuItem(value: 'edit', child: Text('Edit Fee')),
                  const PopupMenuItem(
                      value: 'invoice', child: Text('View Invoice')),
                ],
                child: const Icon(Icons.more_vert,
                    size: 18, color: AppColors.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (invoice.billingPeriod != null)
                      Text('Period: ${invoice.billingPeriod}',
                          style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.textSecondary)),
                    const SizedBox(height: 2),
                    Text(
                      invoice.isPaid
                          ? 'Paid on: ${_fmtDate(invoice.paidOn)}'
                          : 'Due: ${_fmtDate(invoice.dueDate)}',
                      style: TextStyle(fontSize: 11, color: _statusColor),
                    ),
                  ],
                ),
              ),
              if (!invoice.isPaid)
                GestureDetector(
                  onTap: onRecordPayment,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.approved.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: AppColors.approved.withValues(alpha: 0.3)),
                    ),
                    child: const Text('Record Payment',
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.approved)),
                  ),
                )
              else
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.approved.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check_circle_rounded,
                          size: 13, color: AppColors.approved),
                      const SizedBox(width: 4),
                      Text(invoice.paymentMode ?? 'Paid',
                          style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.approved)),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  String _fmtDate(String? d) {
    if (d == null || d.isEmpty) return '-';
    try {
      return DateFormat('d MMM yyyy').format(DateTime.parse(d));
    } catch (_) {
      return d;
    }
  }
}

// ── Record payment bottom sheet ───────────────────────────────────────────────

class _RecordPaymentSheet extends StatefulWidget {
  const _RecordPaymentSheet({required this.invoice, required this.ctrl});
  final FeeInvoice invoice;
  final OwnerFeesController ctrl;

  @override
  State<_RecordPaymentSheet> createState() => _RecordPaymentSheetState();
}

class _RecordPaymentSheetState extends State<_RecordPaymentSheet> {
  late final TextEditingController _amount;
  late final TextEditingController _notes;
  DateTime _paymentDate = DateTime.now();
  String _paymentMode = 'Cash';

  static const _modes = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];
  final _fmt =
      NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _amount =
        TextEditingController(text: widget.invoice.amount.toStringAsFixed(0));
    _notes = TextEditingController();
  }

  @override
  void dispose() {
    _amount.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amt = double.tryParse(_amount.text.trim());
    if (amt == null || amt <= 0) {
      Get.snackbar('Invalid', 'Enter a valid payment amount.',
          snackPosition: SnackPosition.BOTTOM);
      return;
    }

    widget.ctrl.recordPayment(
      widget.invoice,
      amt,
      _paymentDate.toIso8601String().substring(0, 10),
      _paymentMode,
    );
    Get.back();
    Get.snackbar(
      'Payment Recorded',
      '${_fmt.format(amt)} received from ${widget.invoice.studentName}',
      snackPosition: SnackPosition.BOTTOM,
    );
  }

  @override
  Widget build(BuildContext context) {
    final invoice = widget.invoice;
    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _SheetHandle(title: 'Record Payment'),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(invoice.studentName,
                                style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600)),
                            if (invoice.batchName != null)
                              Text(invoice.batchName!,
                                  style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary)),
                            if (invoice.billingPeriod != null)
                              Text(invoice.billingPeriod!,
                                  style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.textSecondary)),
                          ],
                        ),
                      ),
                      Text(_fmt.format(invoice.amount),
                          style: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _FieldLabel('Amount Received (₹)'),
                TextField(
                  controller: _amount,
                  keyboardType: TextInputType.number,
                  decoration: _inputDeco('').copyWith(prefixText: '₹ '),
                ),
                const SizedBox(height: 16),
                _FieldLabel('Payment Mode'),
                Wrap(
                  spacing: 8,
                  children: _modes.map((m) {
                    final sel = _paymentMode == m;
                    return GestureDetector(
                      onTap: () => setState(() => _paymentMode = m),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
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
                        child: Text(m,
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: sel
                                    ? Colors.white
                                    : AppColors.primary)),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Expanded(
                      child: Text('Payment Date',
                          style: TextStyle(
                              fontSize: 13, fontWeight: FontWeight.w500)),
                    ),
                    GestureDetector(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _paymentDate,
                          firstDate: DateTime(2020),
                          lastDate: DateTime.now(),
                          builder: (ctx, child) => Theme(
                            data: Theme.of(ctx).copyWith(
                                colorScheme: const ColorScheme.light(
                                    primary: AppColors.primary)),
                            child: child!,
                          ),
                        );
                        if (picked != null) {
                          setState(() => _paymentDate = picked);
                        }
                      },
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            DateFormat('d MMM yyyy').format(_paymentDate),
                            style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.primary,
                                fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.edit_calendar_rounded,
                              size: 16, color: AppColors.primary),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _FieldLabel('Notes (optional)'),
                TextField(
                  controller: _notes,
                  maxLines: 2,
                  decoration: _inputDeco('Reference number, remarks...'),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: _submit,
                    icon: const Icon(Icons.check_circle_rounded, size: 18),
                    label: const Text('Confirm Payment'),
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

// ── Edit fee sheet ────────────────────────────────────────────────────────────

class _EditFeeSheet extends StatefulWidget {
  const _EditFeeSheet({required this.invoice, required this.ctrl});
  final FeeInvoice invoice;
  final OwnerFeesController ctrl;

  @override
  State<_EditFeeSheet> createState() => _EditFeeSheetState();
}

class _EditFeeSheetState extends State<_EditFeeSheet> {
  late final TextEditingController _amount;
  late final TextEditingController _billingPeriod;
  late DateTime _dueDate;

  @override
  void initState() {
    super.initState();
    _amount =
        TextEditingController(text: widget.invoice.amount.toStringAsFixed(0));
    _billingPeriod =
        TextEditingController(text: widget.invoice.billingPeriod ?? '');
    _dueDate = DateTime.tryParse(widget.invoice.dueDate) ?? DateTime.now();
  }

  @override
  void dispose() {
    _amount.dispose();
    _billingPeriod.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amt = double.tryParse(_amount.text.trim());
    if (amt == null || amt <= 0) {
      Get.snackbar('Invalid', 'Enter a valid amount.',
          snackPosition: SnackPosition.BOTTOM);
      return;
    }
    final ok = await widget.ctrl.updateFee(widget.invoice.id, {
      'amount': amt,
      'due_date': _dueDate.toIso8601String().substring(0, 10),
      if (_billingPeriod.text.trim().isNotEmpty)
        'billing_period': _billingPeriod.text.trim(),
    });
    if (ok) {
      Get.back();
      Get.snackbar('Updated', 'Fee record updated',
          snackPosition: SnackPosition.BOTTOM);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _SheetHandle(title: 'Edit Fee — ${widget.invoice.studentName}'),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _FieldLabel('Amount (₹)'),
                TextField(
                  controller: _amount,
                  keyboardType: TextInputType.number,
                  decoration: _inputDeco('').copyWith(prefixText: '₹ '),
                ),
                const SizedBox(height: 16),
                _FieldLabel('Billing Period'),
                TextField(
                  controller: _billingPeriod,
                  decoration: _inputDeco('e.g. Jun 2026'),
                ),
                const SizedBox(height: 16),
                _FieldLabel('Due Date'),
                _DatePickerTile(
                  date: _dueDate,
                  hint: 'Select due date',
                  firstDate: DateTime(2024),
                  lastDate: DateTime(2030),
                  onPicked: (d) => setState(() => _dueDate = d),
                ),
                const SizedBox(height: 24),
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
                            : const Text('Save Changes'),
                      ),
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Create Fee sheet ──────────────────────────────────────────────────────────

class _CreateFeeSheet extends StatefulWidget {
  const _CreateFeeSheet({required this.ctrl});
  final OwnerFeesController ctrl;

  @override
  State<_CreateFeeSheet> createState() => _CreateFeeSheetState();
}

class _CreateFeeSheetState extends State<_CreateFeeSheet> {
  final _amount = TextEditingController();
  final _billingPeriod = TextEditingController();
  OwnerStudent? _selectedStudent;
  DateTime _dueDate = DateTime.now().add(const Duration(days: 7));

  @override
  void dispose() {
    _amount.dispose();
    _billingPeriod.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_selectedStudent == null) {
      Get.snackbar('Required', 'Please select a student.',
          snackPosition: SnackPosition.BOTTOM);
      return;
    }
    final amt = double.tryParse(_amount.text.trim());
    if (amt == null || amt <= 0) {
      Get.snackbar('Invalid', 'Enter a valid amount.',
          snackPosition: SnackPosition.BOTTOM);
      return;
    }
    final period = _billingPeriod.text.trim().isEmpty
        ? DateFormat('MMM yyyy').format(_dueDate)
        : _billingPeriod.text.trim();

    final payload = {
      'student_id': _selectedStudent!.id,
      'student_name': _selectedStudent!.name,
      'batch_id': _selectedStudent!.batchId,
      'batch_name': _selectedStudent!.batchName,
      'amount': amt,
      'due_date': _dueDate.toIso8601String().substring(0, 10),
      'billing_period': period,
    };
    final ok = await widget.ctrl.createFee(payload);
    if (ok) {
      Get.back();
      Get.snackbar('Fee Created', 'Bill issued to ${_selectedStudent!.name}',
          snackPosition: SnackPosition.BOTTOM);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            _SheetHandle(title: 'Create Fee'),
            Expanded(
              child: ListView(
                controller: scrollCtrl,
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                children: [
                  _FieldLabel('Student *'),
                  _StudentPickerTile(
                    selected: _selectedStudent,
                    students: widget.ctrl.students,
                    onPicked: (s) => setState(() {
                      _selectedStudent = s;
                      if (s?.batchId != null) {
                        // Pre-fill amount from batch's monthly fee.
                        final batch = widget.ctrl.batches
                            .firstWhereOrNull((b) => b.id == s!.batchId);
                        if (batch?.monthlyFee != null && _amount.text.isEmpty) {
                          _amount.text =
                              batch!.monthlyFee!.toStringAsFixed(0);
                        }
                      }
                    }),
                  ),
                  const SizedBox(height: 16),
                  _FieldLabel('Amount (₹) *'),
                  TextField(
                    controller: _amount,
                    keyboardType: TextInputType.number,
                    decoration: _inputDeco('').copyWith(prefixText: '₹ '),
                  ),
                  const SizedBox(height: 16),
                  _FieldLabel('Billing Period'),
                  TextField(
                    controller: _billingPeriod,
                    decoration:
                        _inputDeco('e.g. Jun 2026 (default: month of due date)'),
                  ),
                  const SizedBox(height: 16),
                  _FieldLabel('Due Date *'),
                  _DatePickerTile(
                    date: _dueDate,
                    hint: 'Select due date',
                    firstDate: DateTime.now()
                        .subtract(const Duration(days: 30)),
                    lastDate: DateTime(2030),
                    onPicked: (d) => setState(() => _dueDate = d),
                  ),
                  const SizedBox(height: 24),
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
                              : const Text('Issue Bill'),
                        ),
                      )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Bulk bill batch sheet ─────────────────────────────────────────────────────

class _BulkBillSheet extends StatefulWidget {
  const _BulkBillSheet({required this.ctrl});
  final OwnerFeesController ctrl;

  @override
  State<_BulkBillSheet> createState() => _BulkBillSheetState();
}

class _BulkBillSheetState extends State<_BulkBillSheet> {
  final _amount = TextEditingController();
  final _billingPeriod = TextEditingController(
      text: DateFormat('MMM yyyy').format(DateTime.now()));
  OwnerBatch? _selectedBatch;
  DateTime _dueDate = DateTime.now().add(const Duration(days: 10));

  @override
  void dispose() {
    _amount.dispose();
    _billingPeriod.dispose();
    super.dispose();
  }

  int get _studentsInBatch {
    if (_selectedBatch == null) return 0;
    return widget.ctrl.students
        .where((s) => s.batchId == _selectedBatch!.id)
        .length;
  }

  Future<void> _submit() async {
    if (_selectedBatch == null) {
      Get.snackbar('Required', 'Please select a batch.',
          snackPosition: SnackPosition.BOTTOM);
      return;
    }
    final amt = double.tryParse(_amount.text.trim());
    if (amt == null || amt <= 0) {
      Get.snackbar('Invalid', 'Enter a valid amount.',
          snackPosition: SnackPosition.BOTTOM);
      return;
    }
    final created = await widget.ctrl.bulkBillBatch(
      batchId: _selectedBatch!.id,
      amount: amt,
      dueDate: _dueDate.toIso8601String().substring(0, 10),
      billingPeriod: _billingPeriod.text.trim(),
    );
    Get.back();
    if (created > 0) {
      Get.snackbar(
          'Bills Generated', '$created students billed for ${_billingPeriod.text}',
          snackPosition: SnackPosition.BOTTOM);
    } else {
      Get.snackbar('No new bills',
          'All students already billed for this period.',
          snackPosition: SnackPosition.BOTTOM);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(
        locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            _SheetHandle(title: 'Bulk Bill Batch'),
            Expanded(
              child: ListView(
                controller: scrollCtrl,
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.07),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color:
                              AppColors.accent.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline,
                            color: AppColors.accent, size: 18),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Generate fee invoices for every student in the selected batch.',
                            style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _FieldLabel('Batch *'),
                  _DropdownField<OwnerBatch>(
                    value: _selectedBatch,
                    hint: 'Select batch',
                    items: widget.ctrl.batches
                        .where((b) => b.isActive)
                        .toList(),
                    labelBuilder: (b) =>
                        '${b.name} (${widget.ctrl.students.where((s) => s.batchId == b.id).length} students)',
                    onChanged: (b) => setState(() {
                      _selectedBatch = b;
                      if (b?.monthlyFee != null && _amount.text.isEmpty) {
                        _amount.text = b!.monthlyFee!.toStringAsFixed(0);
                      }
                    }),
                  ),
                  if (_selectedBatch != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      '$_studentsInBatch students will be billed',
                      style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          fontStyle: FontStyle.italic),
                    ),
                  ],
                  const SizedBox(height: 16),
                  _FieldLabel('Amount per student (₹) *'),
                  TextField(
                    controller: _amount,
                    keyboardType: TextInputType.number,
                    decoration: _inputDeco('').copyWith(prefixText: '₹ '),
                  ),
                  const SizedBox(height: 16),
                  _FieldLabel('Billing Period *'),
                  TextField(
                    controller: _billingPeriod,
                    decoration: _inputDeco('e.g. Jun 2026'),
                  ),
                  const SizedBox(height: 16),
                  _FieldLabel('Due Date *'),
                  _DatePickerTile(
                    date: _dueDate,
                    hint: 'Select due date',
                    firstDate: DateTime.now()
                        .subtract(const Duration(days: 30)),
                    lastDate: DateTime(2030),
                    onPicked: (d) => setState(() => _dueDate = d),
                  ),
                  if (_selectedBatch != null && _amount.text.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.approved.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calculate_rounded,
                              color: AppColors.approved, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Total billing: ${fmt.format((double.tryParse(_amount.text) ?? 0) * _studentsInBatch)}',
                              style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.approved),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
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
                              : const Text('Generate Bills'),
                        ),
                      )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Invoice preview ───────────────────────────────────────────────────────────

class _InvoicePreview extends StatelessWidget {
  const _InvoicePreview({required this.invoice, required this.fmt});
  final FeeInvoice invoice;
  final NumberFormat fmt;

  @override
  Widget build(BuildContext context) {
    final cgst = invoice.amount * 0.09;
    final sgst = invoice.amount * 0.09;
    final total = invoice.amount + cgst + sgst;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _SheetHandle(title: 'Invoice Preview'),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 4, 24, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Column(
                    children: [
                      const Icon(Icons.school_rounded,
                          size: 32, color: AppColors.primary),
                      const SizedBox(height: 4),
                      const Text('SiraguWings',
                          style: TextStyle(
                              fontSize: 18, fontWeight: FontWeight.bold)),
                      Text(invoice.centerName ?? 'Center',
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 12),
                _kv('Invoice #', invoice.id.toUpperCase()),
                _kv('Student', invoice.studentName),
                if (invoice.batchName != null)
                  _kv('Batch', invoice.batchName!),
                if (invoice.billingPeriod != null)
                  _kv('Period', invoice.billingPeriod!),
                _kv('Due Date',
                    DateFormat('d MMM yyyy').format(DateTime.parse(invoice.dueDate))),
                _kv('Status', invoice.status),
                const SizedBox(height: 12),
                const Divider(),
                const SizedBox(height: 12),
                _kv('Subtotal', fmt.format(invoice.amount)),
                _kv('CGST (9%)', fmt.format(cgst)),
                _kv('SGST (9%)', fmt.format(sgst)),
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold)),
                    Text(fmt.format(total),
                        style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary)),
                  ],
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Get.back();
                      Get.snackbar('Coming Soon',
                          'PDF download will be available soon',
                          snackPosition: SnackPosition.BOTTOM);
                    },
                    icon: const Icon(Icons.download_rounded, size: 18),
                    label: const Text('Download PDF'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _kv(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(k,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.textSecondary)),
            Text(v,
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary)),
          ],
        ),
      );
}

// ── Student picker ────────────────────────────────────────────────────────────

class _StudentPickerTile extends StatelessWidget {
  const _StudentPickerTile({
    required this.selected,
    required this.students,
    required this.onPicked,
  });

  final OwnerStudent? selected;
  final List<OwnerStudent> students;
  final ValueChanged<OwnerStudent?> onPicked;

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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    selected?.name ?? 'Search & select student',
                    style: TextStyle(
                      fontSize: 14,
                      color: selected != null
                          ? AppColors.textPrimary
                          : AppColors.textSecondary,
                    ),
                  ),
                  if (selected?.batchName != null)
                    Text(selected!.batchName!,
                        style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary)),
                ],
              ),
            ),
            if (selected != null)
              GestureDetector(
                onTap: () => onPicked(null),
                child: const Icon(Icons.clear,
                    size: 18, color: AppColors.textSecondary),
              )
            else
              const Icon(Icons.search,
                  size: 18, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }

  void _showPicker(BuildContext ctx) {
    showDialog(
      context: ctx,
      builder: (_) => _StudentPickerDialog(
        students: students,
        onPicked: onPicked,
      ),
    );
  }
}

class _StudentPickerDialog extends StatefulWidget {
  const _StudentPickerDialog({required this.students, required this.onPicked});
  final List<OwnerStudent> students;
  final ValueChanged<OwnerStudent?> onPicked;

  @override
  State<_StudentPickerDialog> createState() => _StudentPickerDialogState();
}

class _StudentPickerDialogState extends State<_StudentPickerDialog> {
  String _query = '';

  List<OwnerStudent> get _filtered {
    if (_query.isEmpty) return widget.students;
    final q = _query.toLowerCase();
    return widget.students
        .where((s) =>
            s.name.toLowerCase().contains(q) ||
            (s.batchName?.toLowerCase().contains(q) ?? false))
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
                    child: Text('Select Student',
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
                  hintText: 'Search by name or batch',
                  prefixIcon: const Icon(Icons.search, size: 20),
                  contentPadding: const EdgeInsets.symmetric(vertical: 0),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: AppColors.border)),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: AppColors.border)),
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
                  final s = _filtered[i];
                  return ListTile(
                    leading: CircleAvatar(
                      radius: 18,
                      backgroundColor:
                          AppColors.primary.withValues(alpha: 0.12),
                      child: Text(
                        s.name.isNotEmpty ? s.name[0].toUpperCase() : 'S',
                        style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary),
                      ),
                    ),
                    title:
                        Text(s.name, style: const TextStyle(fontSize: 14)),
                    subtitle: Text(s.batchName ?? 'No batch',
                        style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary)),
                    onTap: () {
                      widget.onPicked(s);
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
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 17, fontWeight: FontWeight.bold)),
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

class _DatePickerTile extends StatelessWidget {
  const _DatePickerTile({
    required this.date,
    required this.hint,
    required this.firstDate,
    required this.lastDate,
    required this.onPicked,
  });

  final DateTime? date;
  final String hint;
  final DateTime firstDate;
  final DateTime lastDate;
  final ValueChanged<DateTime> onPicked;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: date ?? DateTime.now(),
          firstDate: firstDate,
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
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(12)),
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
                        style: const TextStyle(fontSize: 13),
                        overflow: TextOverflow.ellipsis),
                  ))
              .toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }
}
