class FeeInvoice {
  final String id;
  final String studentId;
  final String studentName;
  final String centerId;
  final String? centerName;
  final String? batchId;
  final String? batchName;
  final double amount;
  final String dueDate;
  final String status;
  final String? paidOn;
  final String? billingPeriod;
  final String? paymentMode;
  final String? notes;

  const FeeInvoice({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.centerId,
    this.centerName,
    this.batchId,
    this.batchName,
    required this.amount,
    required this.dueDate,
    required this.status,
    this.paidOn,
    this.billingPeriod,
    this.paymentMode,
    this.notes,
  });

  bool get isPaid => status == 'Paid';
  bool get isOverdue => status == 'Overdue';
  bool get isPending => status == 'Pending';

  factory FeeInvoice.fromJson(Map<String, dynamic> j) => FeeInvoice(
        id: j['id'] as String,
        studentId: j['student_id'] as String,
        studentName: j['student_name'] as String,
        centerId: j['center_id'] as String,
        centerName: j['center_name'] as String?,
        batchId: j['batch_id'] as String?,
        batchName: j['batch_name'] as String?,
        amount: ((j['amount'] as num?) ?? 0).toDouble(),
        dueDate: j['due_date'] as String,
        status: j['status'] as String,
        paidOn: j['paid_on'] as String?,
        billingPeriod: j['billing_period'] as String?,
        paymentMode: j['payment_mode'] as String?,
        notes: j['notes'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'student_id': studentId,
        'student_name': studentName,
        'center_id': centerId,
        'center_name': centerName,
        'batch_id': batchId,
        'batch_name': batchName,
        'amount': amount,
        'due_date': dueDate,
        'status': status,
        'paid_on': paidOn,
        'billing_period': billingPeriod,
        'payment_mode': paymentMode,
        'notes': notes,
      };

  FeeInvoice copyWith({
    double? amount,
    String? dueDate,
    String? status,
    String? paidOn,
    String? billingPeriod,
    String? paymentMode,
    String? notes,
  }) =>
      FeeInvoice(
        id: id,
        studentId: studentId,
        studentName: studentName,
        centerId: centerId,
        centerName: centerName,
        batchId: batchId,
        batchName: batchName,
        amount: amount ?? this.amount,
        dueDate: dueDate ?? this.dueDate,
        status: status ?? this.status,
        paidOn: paidOn ?? this.paidOn,
        billingPeriod: billingPeriod ?? this.billingPeriod,
        paymentMode: paymentMode ?? this.paymentMode,
        notes: notes ?? this.notes,
      );
}
