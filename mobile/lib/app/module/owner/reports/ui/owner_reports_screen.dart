import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../../config/themes/app_theme.dart';
import '../controller/reports_controller.dart';
import '../model/owner_reports.dart';

class OwnerReportsScreen extends StatelessWidget {
  const OwnerReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.put(ReportsController());
    final fmt =
        NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Reports & Insights'),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            tooltip: 'Export CSV',
            icon: const Icon(Icons.ios_share_rounded),
            onPressed: () => Get.snackbar('Export Started',
                'CSV will be available in your Downloads shortly',
                snackPosition: SnackPosition.BOTTOM),
          ),
        ],
      ),
      body: Obx(() {
        if (ctrl.loading.value) {
          return const Center(
              child: CircularProgressIndicator(color: AppColors.primary));
        }
        final r = ctrl.reports.value;
        if (r == null) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.bar_chart_rounded,
                    size: 48, color: AppColors.border),
                const SizedBox(height: 12),
                const Text('No data available',
                    style: TextStyle(color: AppColors.textSecondary)),
              ],
            ),
          );
        }
        return RefreshIndicator(
          color: AppColors.primary,
          onRefresh: ctrl.load,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _PeriodSelector(ctrl: ctrl),
              const SizedBox(height: 16),
              _SummaryCards(ctrl: ctrl, fmt: fmt),
              const SizedBox(height: 24),
              _RevenueSection(ctrl: ctrl, fmt: fmt),
              const SizedBox(height: 24),
              _EnrolmentSection(ctrl: ctrl),
              const SizedBox(height: 24),
              if (ctrl.attentionNeeded.isNotEmpty) ...[
                _AttentionNeededCard(batches: ctrl.attentionNeeded),
                const SizedBox(height: 24),
              ],
              _SectionHeader('Top Performing Batches'),
              const SizedBox(height: 12),
              _TopBatchesList(batches: ctrl.topBatches),
              const SizedBox(height: 24),
              _SectionHeader('Attendance by Batch'),
              const SizedBox(height: 12),
              _AttendanceList(batches: r.attendanceByBatch),
              const SizedBox(height: 32),
            ],
          ),
        );
      }),
    );
  }
}

// ── Period selector ───────────────────────────────────────────────────────────

class _PeriodSelector extends StatelessWidget {
  const _PeriodSelector({required this.ctrl});
  final ReportsController ctrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Obx(() => Row(
            children: ReportPeriod.values.map((p) {
              final selected = ctrl.period.value == p;
              return Expanded(
                child: GestureDetector(
                  onTap: () => ctrl.setPeriod(p),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.primary : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      p.label,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: selected
                            ? Colors.white
                            : AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          )),
    );
  }
}

// ── Section header ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);
  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        color: AppColors.textPrimary,
      ),
    );
  }
}

// ── Summary cards ─────────────────────────────────────────────────────────────

class _SummaryCards extends StatelessWidget {
  const _SummaryCards({required this.ctrl, required this.fmt});
  final ReportsController ctrl;
  final NumberFormat fmt;

  @override
  Widget build(BuildContext context) {
    final summary = ctrl.reports.value!.summary;
    final mom = ctrl.revenueMoMChange;
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _RevenueCard(
                label: 'Revenue (This Month)',
                value: fmt.format(summary.totalRevenueThisMonth),
                deltaPct: mom,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                label: 'Outstanding Dues',
                value: fmt.format(summary.outstandingDues),
                icon: Icons.warning_amber_rounded,
                color: AppColors.rejected,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _StatCard(
                label: 'Active Students',
                value: '${summary.activeStudents}',
                icon: Icons.people_rounded,
                color: AppColors.navy,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                label: 'Avg Attendance',
                value: '${ctrl.averageAttendance.toStringAsFixed(1)}%',
                icon: Icons.fact_check_rounded,
                color: AppColors.accent,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _RevenueCard extends StatelessWidget {
  const _RevenueCard({
    required this.label,
    required this.value,
    required this.deltaPct,
  });
  final String label;
  final String value;
  final double deltaPct;

  @override
  Widget build(BuildContext context) {
    final isPositive = deltaPct >= 0;
    final deltaColor = isPositive ? AppColors.approved : AppColors.rejected;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: AppColors.approved.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.trending_up_rounded,
                color: AppColors.approved, size: 18),
          ),
          const SizedBox(height: 10),
          Text(value,
              style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(
                isPositive
                    ? Icons.arrow_upward_rounded
                    : Icons.arrow_downward_rounded,
                size: 11,
                color: deltaColor,
              ),
              Text(
                '${deltaPct.abs().toStringAsFixed(1)}% MoM',
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: deltaColor),
              ),
            ],
          ),
          Text(label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 10, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 10),
          Text(value,
              style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 4),
          Text(label,
              maxLines: 2,
              style: const TextStyle(
                  fontSize: 10, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

// ── Revenue section ───────────────────────────────────────────────────────────

class _RevenueSection extends StatelessWidget {
  const _RevenueSection({required this.ctrl, required this.fmt});
  final ReportsController ctrl;
  final NumberFormat fmt;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const _SectionHeader('Revenue Trend'),
            Text(
              'Total: ${fmt.format(ctrl.totalRevenueInPeriod)}',
              style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.approved),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _BarChart(
          points: ctrl.filteredRevenue,
          fmt: fmt,
          color: AppColors.approved,
        ),
      ],
    );
  }
}

// ── Enrolment section ─────────────────────────────────────────────────────────

class _EnrolmentSection extends StatelessWidget {
  const _EnrolmentSection({required this.ctrl});
  final ReportsController ctrl;

  @override
  Widget build(BuildContext context) {
    final points = ctrl.filteredEnrolment;
    int delta = 0;
    if (points.length >= 2) {
      delta = (points.last.amount - points.first.amount).round();
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const _SectionHeader('Enrolment Trend'),
            if (delta != 0)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: (delta > 0 ? AppColors.approved : AppColors.rejected)
                      .withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      delta > 0
                          ? Icons.trending_up_rounded
                          : Icons.trending_down_rounded,
                      size: 12,
                      color: delta > 0
                          ? AppColors.approved
                          : AppColors.rejected,
                    ),
                    const SizedBox(width: 3),
                    Text(
                      '${delta > 0 ? '+' : ''}$delta students',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: delta > 0
                            ? AppColors.approved
                            : AppColors.rejected,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        _BarChart(
          points: points,
          color: AppColors.accent,
          isCurrency: false,
        ),
      ],
    );
  }
}

// ── Attention needed banner ───────────────────────────────────────────────────

class _AttentionNeededCard extends StatelessWidget {
  const _AttentionNeededCard({required this.batches});
  final List<BatchAttendance> batches;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.rejected.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.rejected.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.error_outline_rounded,
                  color: AppColors.rejected, size: 20),
              SizedBox(width: 8),
              Text('Needs Attention',
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.rejected)),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Batches with attendance below 80%',
            style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 10),
          ...batches.map((b) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    const Icon(Icons.circle, size: 6, color: AppColors.rejected),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(b.batchName,
                          style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textPrimary)),
                    ),
                    Text('${b.attendancePct.toStringAsFixed(0)}%',
                        style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.rejected)),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}

// ── Top batches ───────────────────────────────────────────────────────────────

class _TopBatchesList extends StatelessWidget {
  const _TopBatchesList({required this.batches});
  final List<BatchAttendance> batches;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: List.generate(batches.length, (i) {
          final b = batches[i];
          final medals = ['🥇', '🥈', '🥉'];
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    SizedBox(
                      width: 28,
                      child: i < 3
                          ? Text(medals[i],
                              style: const TextStyle(fontSize: 18))
                          : Text('${i + 1}',
                              style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textSecondary)),
                    ),
                    Expanded(
                      child: Text(
                        b.batchName,
                        style: const TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                    ),
                    Text(
                      '${b.attendancePct.toStringAsFixed(1)}%',
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppColors.approved),
                    ),
                  ],
                ),
              ),
              if (i < batches.length - 1)
                const Divider(height: 1, indent: 16, endIndent: 16),
            ],
          );
        }),
      ),
    );
  }
}

// ── Attendance list ───────────────────────────────────────────────────────────

class _AttendanceList extends StatelessWidget {
  const _AttendanceList({required this.batches});
  final List<BatchAttendance> batches;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: List.generate(batches.length, (i) {
          final b = batches[i];
          final pct = b.attendancePct;
          final color = pct >= 80
              ? AppColors.approved
              : pct >= 60
                  ? AppColors.pending
                  : AppColors.rejected;
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            b.batchName,
                            style: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                        ),
                        Text(
                          '${pct.toStringAsFixed(1)}%',
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: color),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: pct / 100,
                        backgroundColor: AppColors.border,
                        valueColor: AlwaysStoppedAnimation(color),
                        minHeight: 5,
                      ),
                    ),
                  ],
                ),
              ),
              if (i < batches.length - 1)
                const Divider(height: 1, indent: 16, endIndent: 16),
            ],
          );
        }),
      ),
    );
  }
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

class _BarChart extends StatelessWidget {
  const _BarChart({
    required this.points,
    this.fmt,
    this.color = AppColors.primary,
    this.isCurrency = true,
  });

  final List<RevenuePoint> points;
  final NumberFormat? fmt;
  final Color color;
  final bool isCurrency;

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      return Container(
        height: 80,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: const Center(
          child: Text('No data for selected period',
              style: TextStyle(
                  fontSize: 12, color: AppColors.textSecondary)),
        ),
      );
    }

    final maxVal = points.map((p) => p.amount).reduce(math.max);

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          SizedBox(
            height: 140,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: points.map((p) {
                final ratio = maxVal == 0 ? 0.0 : p.amount / maxVal;
                final isLast = p == points.last;
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        if (isCurrency && fmt != null)
                          Text(
                            fmt!.format(p.amount),
                            style: TextStyle(
                                fontSize: 8,
                                fontWeight: isLast
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                                color: isLast
                                    ? color
                                    : AppColors.textSecondary),
                          )
                        else
                          Text(
                            '${p.amount.toInt()}',
                            style: TextStyle(
                                fontSize: 8,
                                fontWeight: isLast
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                                color: isLast
                                    ? color
                                    : AppColors.textSecondary),
                          ),
                        const SizedBox(height: 4),
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 500),
                          height: math.max(4, 100 * ratio),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                color,
                                color.withValues(alpha: 0.65),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: points
                .map((p) => Expanded(
                      child: Text(
                        p.month.length > 3
                            ? p.month.substring(0, 3)
                            : p.month,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            fontSize: 9, color: AppColors.textSecondary),
                      ),
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }
}
