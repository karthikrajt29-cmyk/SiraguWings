import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../../config/themes/app_theme.dart';
import '../../../owner/fees/model/fee_invoice.dart';
import '../controller/parent_fees_controller.dart';

class ParentFeesScreen extends StatelessWidget {
  const ParentFeesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.put(ParentFeesController());
    final fmt = NumberFormat.currency(
        locale: 'en_IN', symbol: '₹', decimalDigits: 0);

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Fees'),
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
            _SummaryBanner(ctrl: ctrl, fmt: fmt),
            _TabsView(ctrl: ctrl, fmt: fmt),
          ],
        );
      }),
    );
  }
}

class _SummaryBanner extends StatelessWidget {
  const _SummaryBanner({required this.ctrl, required this.fmt});
  final ParentFeesController ctrl;
  final NumberFormat fmt;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      color: Colors.white,
      child: Row(
        children: [
          Expanded(
            child: _BannerTile(
              label: 'Next Due',
              value: ctrl.nextDueAmount > 0
                  ? fmt.format(ctrl.nextDueAmount)
                  : '—',
              color: ctrl.overdue.isNotEmpty
                  ? AppColors.rejected
                  : AppColors.pending,
            ),
          ),
          Container(width: 1, height: 48, color: AppColors.border),
          Expanded(
            child: _BannerTile(
              label: 'Paid (YTD)',
              value: fmt.format(ctrl.totalPaidYtd),
              color: AppColors.approved,
            ),
          ),
        ],
      ),
    );
  }
}

class _BannerTile extends StatelessWidget {
  const _BannerTile(
      {required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(label,
            style: const TextStyle(
                fontSize: 12, color: AppColors.textSecondary)),
      ],
    );
  }
}

class _TabsView extends StatefulWidget {
  const _TabsView({required this.ctrl, required this.fmt});
  final ParentFeesController ctrl;
  final NumberFormat fmt;

  @override
  State<_TabsView> createState() => _TabsViewState();
}

class _TabsViewState extends State<_TabsView>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Container(
            color: Colors.white,
            child: TabBar(
              controller: _tab,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.primary,
              tabs: const [
                Tab(text: 'Pending / Overdue'),
                Tab(text: 'History'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tab,
              children: [
                _FeeList(
                  invoices: [
                    ...widget.ctrl.overdue,
                    ...widget.ctrl.pending,
                  ],
                  fmt: widget.fmt,
                  emptyLabel: 'No pending fees',
                ),
                _FeeList(
                  invoices: widget.ctrl.paid,
                  fmt: widget.fmt,
                  emptyLabel: 'No payment history',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FeeList extends StatelessWidget {
  const _FeeList({
    required this.invoices,
    required this.fmt,
    required this.emptyLabel,
  });
  final List<FeeInvoice> invoices;
  final NumberFormat fmt;
  final String emptyLabel;

  @override
  Widget build(BuildContext context) {
    if (invoices.isEmpty) {
      return Center(
        child: Text(emptyLabel,
            style: const TextStyle(color: AppColors.textSecondary)),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: invoices.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) => _FeeCard(invoice: invoices[i], fmt: fmt),
    );
  }
}

class _FeeCard extends StatelessWidget {
  const _FeeCard({required this.invoice, required this.fmt});
  final FeeInvoice invoice;
  final NumberFormat fmt;

  Color get _statusColor {
    if (invoice.isPaid) return AppColors.approved;
    if (invoice.isOverdue) return AppColors.rejected;
    return AppColors.pending;
  }

  String get _statusLabel {
    if (invoice.isPaid) return 'Paid';
    if (invoice.isOverdue) return 'Overdue';
    return 'Pending';
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showDetail(context),
      child: Container(
        padding: const EdgeInsets.all(16),
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
                color: _statusColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                invoice.isPaid
                    ? Icons.check_circle_outline_rounded
                    : Icons.receipt_long_rounded,
                color: _statusColor,
                size: 20,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    invoice.billingPeriod ?? 'Fee Invoice',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    invoice.isPaid
                        ? 'Paid on ${invoice.paidOn ?? '-'}'
                        : 'Due: ${invoice.dueDate}',
                    style: TextStyle(
                        fontSize: 12, color: _statusColor),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  fmt.format(invoice.amount),
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: _statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _statusLabel,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: _statusColor,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _InvoiceDetail(invoice: invoice, fmt: fmt),
    );
  }
}

class _InvoiceDetail extends StatelessWidget {
  const _InvoiceDetail({required this.invoice, required this.fmt});
  final FeeInvoice invoice;
  final NumberFormat fmt;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
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
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Invoice Details',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          _DetailRow('Period', invoice.billingPeriod ?? '-'),
          _DetailRow('Amount', fmt.format(invoice.amount)),
          _DetailRow('Status', invoice.status),
          _DetailRow('Due Date', invoice.dueDate),
          if (invoice.paidOn != null) _DetailRow('Paid On', invoice.paidOn!),
          if (invoice.batchName != null)
            _DetailRow('Batch', invoice.batchName!),
          const SizedBox(height: 20),
          if (!invoice.isPaid)
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.payment_rounded),
                label: const Text('Pay Now'),
                onPressed: () {
                  Navigator.pop(context);
                  Get.snackbar(
                    'Payment',
                    'Online payment coming soon',
                    snackPosition: SnackPosition.BOTTOM,
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(
                  fontSize: 13, color: AppColors.textSecondary),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
