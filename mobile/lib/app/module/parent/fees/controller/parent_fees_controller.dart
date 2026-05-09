import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../../../owner/fees/model/fee_invoice.dart';
import '../repository/parent_fees_repository.dart';

class ParentFeesController extends GetxController {
  final _repo = ParentFeesRepository();

  final RxList<FeeInvoice> fees = <FeeInvoice>[].obs;
  final RxBool loading = false.obs;

  List<FeeInvoice> get pending => fees.where((f) => f.isPending).toList();
  List<FeeInvoice> get paid => fees.where((f) => f.isPaid).toList();
  List<FeeInvoice> get overdue => fees.where((f) => f.isOverdue).toList();

  double get nextDueAmount =>
      (pending.isNotEmpty ? pending.first.amount : null) ??
      (overdue.isNotEmpty ? overdue.first.amount : 0);

  double get totalPaidYtd => paid.fold(0, (s, f) => s + f.amount);

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    loading.value = true;
    try {
      fees.value = await _repo.fetchFees();
    } catch (e) {
      debugPrint('[ParentFeesController] $e');
    } finally {
      loading.value = false;
    }
  }
}
