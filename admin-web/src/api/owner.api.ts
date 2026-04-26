import apiClient from './client';
import type { CenterDetail, CenterUpdatePayload } from './centers.api';

// ── Centers ──────────────────────────────────────────────────────────────────

export const updateOwnerCenter = (id: string, payload: CenterUpdatePayload) =>
  apiClient.patch<CenterDetail>(`/owner/centers/${id}`, payload).then((r) => r.data);

// ── Students (owner-scoped) ──────────────────────────────────────────────────

export interface OwnerStudent {
  id: string;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  parent_id: string | null;
  parent_name: string | null;
  parent_mobile: string | null;
  medical_notes: string | null;
  profile_image_url: string | null;
  blood_group: string | null;
  current_class: string | null;
  school_name: string | null;
  address: string | null;
  emergency_contact: string | null;
  invite_status: string;
  status: string;
  added_at: string;
}

export interface OwnerStudentCreatePayload {
  name: string;
  date_of_birth: string;
  gender: string;
  parent_id: string;
  medical_notes?: string | null;
  blood_group?: string | null;
  current_class?: string | null;
  school_name?: string | null;
  profile_image_base64?: string | null;
  date_of_join?: string | null;
}

export interface OwnerStudentUpdatePayload {
  name?: string;
  date_of_birth?: string;
  gender?: string;
  medical_notes?: string | null;
  blood_group?: string | null;
  current_class?: string | null;
  school_name?: string | null;
  profile_image_base64?: string | null;
  date_of_join?: string | null;
}

export const listOwnerStudents = (centerId: string) =>
  apiClient.get<OwnerStudent[]>(`/owner/centers/${centerId}/students`).then((r) => r.data);

export const createOwnerStudent = (centerId: string, payload: OwnerStudentCreatePayload) =>
  apiClient
    .post<OwnerStudent>(`/owner/centers/${centerId}/students`, payload)
    .then((r) => r.data);

export const updateOwnerStudent = (
  centerId: string,
  studentId: string,
  payload: OwnerStudentUpdatePayload,
) =>
  apiClient
    .patch<{ message: string }>(`/owner/centers/${centerId}/students/${studentId}`, payload)
    .then((r) => r.data);

export const removeOwnerStudent = (centerId: string, studentId: string) =>
  apiClient
    .delete<{ message: string }>(`/owner/centers/${centerId}/students/${studentId}`)
    .then((r) => r.data);

// ── Teachers (owner-scoped) ──────────────────────────────────────────────────

export interface OwnerTeacher {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  mobile_number: string;
  specialisation: string | null;
  qualification: string | null;
  experience_years: number | null;
  id_proof_url: string | null;
  qualification_cert_url: string | null;
  joined_at: string;
  is_active: boolean;
}

export interface OwnerTeacherCreatePayload {
  name: string;
  mobile_number: string;
  email?: string | null;
  specialisation?: string | null;
  qualification?: string | null;
  experience_years?: number | null;
  date_of_join?: string | null;
  id_proof_base64?: string | null;
  qualification_cert_base64?: string | null;
}

export interface OwnerTeacherUpdatePayload {
  specialisation?: string | null;
  qualification?: string | null;
  experience_years?: number | null;
  is_active?: boolean;
  date_of_join?: string | null;
  id_proof_base64?: string | null;
  qualification_cert_base64?: string | null;
}

export const listOwnerTeachers = (centerId: string) =>
  apiClient.get<OwnerTeacher[]>(`/owner/centers/${centerId}/teachers`).then((r) => r.data);

export const createOwnerTeacher = (centerId: string, payload: OwnerTeacherCreatePayload) =>
  apiClient
    .post<OwnerTeacher>(`/owner/centers/${centerId}/teachers`, payload)
    .then((r) => r.data);

export const updateOwnerTeacher = (
  centerId: string,
  teacherId: string,
  payload: OwnerTeacherUpdatePayload,
) =>
  apiClient
    .patch<{ message: string }>(`/owner/centers/${centerId}/teachers/${teacherId}`, payload)
    .then((r) => r.data);

export const removeOwnerTeacher = (centerId: string, teacherId: string) =>
  apiClient
    .delete<{ message: string }>(`/owner/centers/${centerId}/teachers/${teacherId}`)
    .then((r) => r.data);


// ── Batches (owner-scoped) ───────────────────────────────────────────────────

export interface OwnerBatch {
  id: string;
  course_name: string;
  batch_name: string;
  category_type: string | null;
  class_days: string;
  start_time: string;
  end_time: string;
  strength_limit: number | null;
  fee_amount: number;
  is_active: boolean;
  teacher_name: string | null;
  teacher_id: string | null;
  created_date: string;
  student_count: number;
}

export interface OwnerBatchCreatePayload {
  course_name: string;
  batch_name: string;
  category_type?: string | null;
  class_days: string;
  start_time: string;
  end_time: string;
  strength_limit?: number | null;
  fee_amount: number;
  teacher_id?: string | null;
}

export interface OwnerBatchUpdatePayload {
  course_name?: string;
  batch_name?: string;
  category_type?: string | null;
  class_days?: string;
  start_time?: string;
  end_time?: string;
  strength_limit?: number | null;
  fee_amount?: number;
  teacher_id?: string | null;
  is_active?: boolean;
}

export const listOwnerBatches = (centerId: string) =>
  apiClient.get<OwnerBatch[]>(`/owner/centers/${centerId}/batches`).then((r) => r.data);

export const createOwnerBatch = (centerId: string, payload: OwnerBatchCreatePayload) =>
  apiClient
    .post<OwnerBatch>(`/owner/centers/${centerId}/batches`, payload)
    .then((r) => r.data);

export const updateOwnerBatch = (
  centerId: string,
  batchId: string,
  payload: OwnerBatchUpdatePayload,
) =>
  apiClient
    .patch<{ message: string }>(`/owner/centers/${centerId}/batches/${batchId}`, payload)
    .then((r) => r.data);

export const removeOwnerBatch = (centerId: string, batchId: string) =>
  apiClient
    .delete<{ message: string }>(`/owner/centers/${centerId}/batches/${batchId}`)
    .then((r) => r.data);

// ── Parents (owner-scoped) ───────────────────────────────────────────────────

export interface OwnerParent {
  id: string;
  name: string;
  mobile_number: string;
  email: string | null;
  status: string;
  student_count: number;
}

export const listOwnerParents = (centerId: string) =>
  apiClient.get<OwnerParent[]>(`/owner/centers/${centerId}/parents`).then((r) => r.data);

// ── Parent search / mapping / creation ───────────────────────────────────────

export interface OwnerParentChild {
  id: string;
  name: string;
  center_id: string | null;
  center_name: string | null;
}

export interface OwnerParentSearchResult {
  id: string;
  name: string;
  mobile_number: string;
  email: string | null;
  status: string;
  is_mapped_to_center: boolean;
  children: OwnerParentChild[];
}

export interface OwnerParentCreatePayload {
  name: string;
  mobile_number: string;
  email?: string;
  address?: string | null;
  emergency_contact?: string | null;
}

export const searchOwnerParents = (q: string, forCenterId: string) =>
  apiClient
    .get<OwnerParentSearchResult[]>('/owner/parents/search', {
      params: { q, for_center_id: forCenterId },
    })
    .then((r) => r.data);

export const linkOwnerParentToCenter = (centerId: string, parentId: string) =>
  apiClient
    .post<OwnerParent>(`/owner/centers/${centerId}/parents/${parentId}/link`)
    .then((r) => r.data);

export const createOwnerParent = (centerId: string, payload: OwnerParentCreatePayload) =>
  apiClient
    .post<OwnerParent>(`/owner/centers/${centerId}/parents`, payload)
    .then((r) => r.data);

// ── Batch students (owner-scoped) ────────────────────────────────────────────

export interface OwnerBatchStudent {
  batch_student_id: string;
  student_id: string;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  parent_name: string | null;
  assigned_at: string | null;
}

export const listOwnerBatchStudents = (centerId: string, batchId: string) =>
  apiClient
    .get<OwnerBatchStudent[]>(`/owner/centers/${centerId}/batches/${batchId}/students`)
    .then((r) => r.data);

export const addOwnerBatchStudent = (centerId: string, batchId: string, studentId: string) =>
  apiClient
    .post<{ message: string }>(`/owner/centers/${centerId}/batches/${batchId}/students`, {
      student_id: studentId,
    })
    .then((r) => r.data);

export const removeOwnerBatchStudent = (centerId: string, batchId: string, studentId: string) =>
  apiClient
    .delete<{ message: string }>(
      `/owner/centers/${centerId}/batches/${batchId}/students/${studentId}`,
    )
    .then((r) => r.data);

// ── Attendance (owner-scoped) ────────────────────────────────────────────────

export interface OwnerAttendanceRecord {
  student_id: string;
  name: string;
  gender: string | null;
  date_of_birth: string | null;
  parent_name: string | null;
  attendance_status: 'Present' | 'Absent' | null;
  marked_at: string | null;
  edited_at: string | null;
}

export interface OwnerAttendanceRangeRow {
  attendance_date: string;
  status: 'Present' | 'Absent';
  student_id: string;
  student_name: string;
}

export const getOwnerBatchAttendance = (centerId: string, batchId: string, date: string) =>
  apiClient
    .get<OwnerAttendanceRecord[]>(
      `/owner/centers/${centerId}/batches/${batchId}/attendance`,
      { params: { date } },
    )
    .then((r) => r.data);

export const markOwnerBatchAttendance = (
  centerId: string,
  batchId: string,
  body: { date: string; records: { student_id: string; status: 'Present' | 'Absent' }[] },
) =>
  apiClient
    .post<{ message: string }>(`/owner/centers/${centerId}/batches/${batchId}/attendance`, body)
    .then((r) => r.data);

export const getOwnerBatchAttendanceRange = (
  centerId: string,
  batchId: string,
  start: string,
  end: string,
) =>
  apiClient
    .get<OwnerAttendanceRangeRow[]>(
      `/owner/centers/${centerId}/batches/${batchId}/attendance/range`,
      { params: { start, end } },
    )
    .then((r) => r.data);

// ── Notifications (owner-scoped) ─────────────────────────────────────────────

export interface OwnerNotification {
  id: string;
  center_id: string | null;
  type: 'Push' | 'SMS' | 'Email' | 'InApp';
  category: string;
  title: string;
  body: string;
  delivery_status: string;
  read_at: string | null;
  created_date: string | null;
}

export type OwnerBroadcastAudience = 'Parents' | 'Teachers';

export interface OwnerBroadcastPayload {
  center_id: string;
  audience: OwnerBroadcastAudience;
  title: string;
  body: string;
  category?: string;
}

export const listOwnerNotifications = (onlyUnread = false) =>
  apiClient
    .get<OwnerNotification[]>('/owner/notifications', { params: { only_unread: onlyUnread } })
    .then((r) => r.data);

export const getOwnerUnreadCount = () =>
  apiClient.get<{ unread: number }>('/owner/notifications/unread-count').then((r) => r.data);

export const markOwnerNotificationRead = (id: string) =>
  apiClient
    .post<{ message: string }>(`/owner/notifications/${id}/read`)
    .then((r) => r.data);

export const markAllOwnerNotificationsRead = () =>
  apiClient.post<{ message: string }>('/owner/notifications/read-all').then((r) => r.data);

export const broadcastOwnerNotification = (payload: OwnerBroadcastPayload) =>
  apiClient
    .post<{ message: string; recipient_count: number }>('/owner/notifications/broadcast', payload)
    .then((r) => r.data);

// ── Fees (owner-scoped) ──────────────────────────────────────────────────────

export type FeeStatus = 'Pending' | 'Paid' | 'Overdue' | 'PartiallyPaid';
export type PaymentMode = 'UPI' | 'Card' | 'NetBanking' | 'Cash' | 'BankTransfer';

export interface OwnerFee {
  id: string;
  student_id: string;
  student_name: string;
  batch_id: string | null;
  batch_name: string | null;
  course_name: string | null;
  amount: number;
  paid_amount: number;
  outstanding: number;
  due_date: string;
  status: FeeStatus;
  notes: string | null;
  created_date: string | null;
  reminder_count: number;
  reminder_sent_at: string | null;
  has_parent: boolean;
}

export interface OwnerFeeSummary {
  total_billed: number;
  collected: number;
  outstanding: number;
  overdue_amount: number;
  paid_count: number;
  pending_count: number;
  partial_count: number;
  overdue_count: number;
  collection_pct: number;
}

export interface OwnerFeeCreatePayload {
  student_id: string;
  batch_id?: string | null;
  amount: number;
  due_date: string;
  notes?: string | null;
}

export interface OwnerFeeBulkPayload {
  batch_id: string;
  amount: number;
  due_date: string;
  notes?: string | null;
}

export interface OwnerFeeUpdatePayload {
  amount?: number;
  due_date?: string;
  notes?: string | null;
}

export interface OwnerFeeFilters {
  status?: FeeStatus;
  student_id?: string;
  batch_id?: string;
  start?: string;
  end?: string;
}

export interface OwnerPayment {
  id: string;
  mode: PaymentMode;
  status: 'Success' | 'Failed' | 'Pending' | 'Refunded';
  transaction_id: string | null;
  gateway_reference: string | null;
  amount_paid: number;
  paid_at: string | null;
  created_date: string | null;
  refund_reason: string | null;
  refunded_at: string | null;
}

export interface OwnerPaymentPayload {
  mode: PaymentMode;
  amount_paid: number;
  transaction_id?: string | null;
  gateway_reference?: string | null;
}

export interface OwnerPlatformInvoice {
  id: string;
  invoice_number: string;
  student_count: number;
  rate_per_student: number;
  sub_total: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
  status: 'Generated' | 'Paid' | 'Overdue' | 'Waived';
  gst_invoice_url: string | null;
  generated_at: string | null;
}

export const listOwnerFees = (centerId: string, filters: OwnerFeeFilters = {}) =>
  apiClient
    .get<OwnerFee[]>(`/owner/centers/${centerId}/fees`, { params: filters })
    .then((r) => r.data);

export const getOwnerFeesSummary = (centerId: string) =>
  apiClient
    .get<OwnerFeeSummary>(`/owner/centers/${centerId}/fees/summary`)
    .then((r) => r.data);

export const createOwnerFee = (centerId: string, payload: OwnerFeeCreatePayload) =>
  apiClient
    .post<{ id: string; status: FeeStatus }>(`/owner/centers/${centerId}/fees`, payload)
    .then((r) => r.data);

export const createOwnerFeesBulk = (centerId: string, payload: OwnerFeeBulkPayload) =>
  apiClient
    .post<{ created: number }>(`/owner/centers/${centerId}/fees/bulk-by-batch`, payload)
    .then((r) => r.data);

export interface GenerateFromBatchesPayload {
  batch_ids: string[];
  due_date: string;
  notes?: string | null;
}

export interface GenerateFromBatchesResult {
  created: number;
  skipped: number;
  batches: { batch_id: string; batch_name: string; created: number; skipped: number }[];
}

export const generateOwnerFeesFromBatches = (centerId: string, payload: GenerateFromBatchesPayload) =>
  apiClient
    .post<GenerateFromBatchesResult>(`/owner/centers/${centerId}/fees/generate-from-batches`, payload)
    .then((r) => r.data);

export const updateOwnerFee = (
  centerId: string,
  feeId: string,
  payload: OwnerFeeUpdatePayload,
) =>
  apiClient
    .patch<{ message: string }>(`/owner/centers/${centerId}/fees/${feeId}`, payload)
    .then((r) => r.data);

export const removeOwnerFee = (centerId: string, feeId: string) =>
  apiClient
    .delete<{ message: string }>(`/owner/centers/${centerId}/fees/${feeId}`)
    .then((r) => r.data);

export const recordOwnerPayment = (
  centerId: string,
  feeId: string,
  payload: OwnerPaymentPayload,
) =>
  apiClient
    .post<{ id: string; fee_status: FeeStatus }>(
      `/owner/centers/${centerId}/fees/${feeId}/payments`,
      payload,
    )
    .then((r) => r.data);

export const listOwnerPayments = (centerId: string, feeId: string) =>
  apiClient
    .get<OwnerPayment[]>(`/owner/centers/${centerId}/fees/${feeId}/payments`)
    .then((r) => r.data);

export const listOwnerPlatformInvoices = (centerId: string) =>
  apiClient
    .get<OwnerPlatformInvoice[]>(`/owner/centers/${centerId}/platform-invoices`)
    .then((r) => r.data);

// ── Fee invoice (rich, GST-aware) / refunds / reminders ──────────────────────

export interface OwnerFeeInvoice {
  invoice_number: string;
  fee: {
    id: string;
    amount: number;
    paid_amount: number;
    outstanding: number;
    due_date: string;
    status: FeeStatus;
    notes: string | null;
    created_date: string | null;
  };
  student: {
    id: string;
    name: string;
    parent_name: string | null;
    parent_mobile: string | null;
    parent_email: string | null;
  };
  batch: { course_name: string; batch_name: string } | null;
  center: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string | null;
    mobile_number: string;
    gstin: string | null;
  };
  tax: {
    has_gst: boolean;
    gst_rate: number;
    half_rate: number;
    base_amount: number;
    gst_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    total_amount: number;
  };
}

export const getOwnerFeeInvoice = (centerId: string, feeId: string) =>
  apiClient
    .get<OwnerFeeInvoice>(`/owner/centers/${centerId}/fees/${feeId}/invoice`)
    .then((r) => r.data);

export const refundOwnerPayment = (
  centerId: string,
  feeId: string,
  paymentId: string,
  reason?: string,
) =>
  apiClient
    .post<{ message: string; fee_status: FeeStatus; refunded_amount: number }>(
      `/owner/centers/${centerId}/fees/${feeId}/payments/${paymentId}/refund`,
      { reason: reason ?? null },
    )
    .then((r) => r.data);

export const sendOwnerFeeReminder = (
  centerId: string,
  feeId: string,
  message?: string,
) =>
  apiClient
    .post<{ message: string; outstanding: number }>(
      `/owner/centers/${centerId}/fees/${feeId}/reminder`,
      { message: message ?? null },
    )
    .then((r) => r.data);
