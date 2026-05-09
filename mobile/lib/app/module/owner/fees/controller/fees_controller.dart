import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../../../auth/controller/auth_controller.dart';
import '../../../../service/api/mock_interceptor.dart';
import '../../batches/model/owner_batch.dart';
import '../../batches/repository/batches_repository.dart';
import '../../students/model/owner_student.dart';
import '../../students/repository/students_repository.dart';
import '../model/fee_invoice.dart';
import '../repository/fees_repository.dart';

class OwnerFeesController extends GetxController {
  final _repo = OwnerFeesRepository();
  final _batchesRepo = BatchesRepository();
  final _studentsRepo = StudentsRepository();

  final RxList<FeeInvoice> fees = <FeeInvoice>[].obs;
  final RxList<OwnerBatch> batches = <OwnerBatch>[].obs;
  final RxList<OwnerStudent> students = <OwnerStudent>[].obs;
  final RxBool loading = false.obs;
  final RxBool saving = false.obs;
  final RxInt tabIndex = 0.obs;
  final RxString searchQuery = ''.obs;

  String get _centerId => Get.find<AuthController>().currentCenterId.value;

  // ── Filtered lists ──────────────────────────────────────────────────────────

  List<FeeInvoice> get _searchFiltered {
    final q = searchQuery.value.toLowerCase();
    if (q.isEmpty) return fees;
    return fees.where((f) {
      return f.studentName.toLowerCase().contains(q) ||
          (f.batchName?.toLowerCase().contains(q) ?? false) ||
          (f.billingPeriod?.toLowerCase().contains(q) ?? false);
    }).toList();
  }

  List<FeeInvoice> get pending =>
      _searchFiltered.where((f) => f.isPending).toList();
  List<FeeInvoice> get paid => _searchFiltered.where((f) => f.isPaid).toList();
  List<FeeInvoice> get overdue =>
      _searchFiltered.where((f) => f.isOverdue).toList();

  // ── Aggregations (use full fees list, not search-filtered) ──────────────────

  double get totalBilled => fees.fold(0, (s, f) => s + f.amount);
  double get collectedThisMonth =>
      fees.where((f) => f.isPaid).fold(0, (s, f) => s + f.amount);
  double get outstanding =>
      fees.where((f) => f.isPending).fold(0, (s, f) => s + f.amount);
  double get overdueAmount =>
      fees.where((f) => f.isOverdue).fold(0, (s, f) => s + f.amount);

  int get pendingCount => fees.where((f) => f.isPending).length;
  int get paidCount => fees.where((f) => f.isPaid).length;
  int get overdueCount => fees.where((f) => f.isOverdue).length;

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    loading.value = true;
    try {
      final centerId = _centerId;
      final results = await Future.wait([
        _repo.fetchFees(centerId),
        _batchesRepo.fetchBatches(centerId),
        _studentsRepo.fetchStudents(centerId),
      ]);
      fees.value = results[0] as List<FeeInvoice>;
      batches.value = results[1] as List<OwnerBatch>;
      students.value = results[2] as List<OwnerStudent>;
    } catch (e) {
      debugPrint('[OwnerFeesController] $e');
    } finally {
      loading.value = false;
    }
  }

  // ── Mutations ───────────────────────────────────────────────────────────────

  Future<bool> createFee(Map<String, dynamic> payload) async {
    saving.value = true;
    try {
      final fee = await _repo.createFee(_centerId, payload);
      fees.insert(0, fee);
      return true;
    } catch (e) {
      debugPrint('[OwnerFeesController] createFee: $e');
      Get.snackbar('Error', 'Could not create fee.',
          snackPosition: SnackPosition.BOTTOM);
      return false;
    } finally {
      saving.value = false;
    }
  }

  Future<bool> updateFee(String feeId, Map<String, dynamic> payload) async {
    saving.value = true;
    try {
      final updated = await _repo.updateFee(_centerId, feeId, payload);
      final idx = fees.indexWhere((f) => f.id == feeId);
      if (idx != -1) fees[idx] = updated;
      return true;
    } catch (e) {
      debugPrint('[OwnerFeesController] updateFee: $e');
      Get.snackbar('Error', 'Could not update fee.',
          snackPosition: SnackPosition.BOTTOM);
      return false;
    } finally {
      saving.value = false;
    }
  }

  Future<int> bulkBillBatch({
    required String batchId,
    required double amount,
    required String dueDate,
    required String billingPeriod,
  }) async {
    saving.value = true;
    try {
      final created = await _repo.bulkBillBatch(_centerId, {
        'batch_id': batchId,
        'amount': amount,
        'due_date': dueDate,
        'billing_period': billingPeriod,
      });
      fees.insertAll(0, created);
      return created.length;
    } catch (e) {
      debugPrint('[OwnerFeesController] bulkBillBatch: $e');
      Get.snackbar('Error', 'Could not generate bills.',
          snackPosition: SnackPosition.BOTTOM);
      return 0;
    } finally {
      saving.value = false;
    }
  }

  Future<bool> sendReminder(FeeInvoice invoice) async {
    try {
      await _repo.sendReminder(_centerId, invoice.id);
      return true;
    } catch (e) {
      debugPrint('[OwnerFeesController] sendReminder: $e');
      return false;
    }
  }

  // ── Payment recording ───────────────────────────────────────────────────────

  void recordPayment(
    FeeInvoice invoice,
    double amount,
    String paymentDate,
    String paymentMode,
  ) {
    final idx = fees.indexWhere((f) => f.id == invoice.id);
    if (idx == -1) return;
    final updated = invoice.copyWith(
      status: 'Paid',
      paidOn: paymentDate,
      paymentMode: paymentMode,
    );
    fees[idx] = updated;
    _persistOverride();
  }

  void markPaid(FeeInvoice invoice) {
    recordPayment(
      invoice,
      invoice.amount,
      DateTime.now().toIso8601String().substring(0, 10),
      'Cash',
    );
    Get.snackbar('Marked Paid', '${invoice.studentName}\'s fee marked as paid',
        snackPosition: SnackPosition.BOTTOM);
  }

  void _persistOverride() {
    MockInterceptor.setOverride(
      'owner.fees',
      fees.map((f) => f.toJson()).toList(),
    );
  }
}
