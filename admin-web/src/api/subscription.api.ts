import apiClient from './client';
import type { PagedResponse } from './centers.api';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  student_limit: number;
  storage_limit_mb: number;
  extra_student_price: number;
  is_active: boolean;
  sort_order: number;
}

export interface StorageAddOn {
  id: string;
  name: string;
  storage_mb: number;
  price: number;
  is_active: boolean;
  sort_order: number;
}

export interface CenterSubscriptionSummary {
  center_id: string;
  center_name: string;
  plan_id: string;
  plan_name: string;
  plan_price: number;
  student_limit: number;
  storage_limit_mb: number;
  extra_student_price: number;
  start_date: string;
  end_date: string | null;
  status: string;
  current_student_count: number;
  storage_used_mb: number;
  addon_storage_mb: number;
  total_storage_mb: number;
  extra_students: number;
  extra_amount: number;
  storage_addon_amount: number;
  estimated_total: number;
}

export interface StoragePurchase {
  id: string;
  name: string;
  storage_mb: number;
  price: number;
  start_date: string;
  end_date: string | null;
  status: string;
}

export interface CenterSubscriptionDetail extends CenterSubscriptionSummary {
  storage_purchases: StoragePurchase[];
  billing_history: BillingHistoryEntry[];
}

export interface BillingHistoryEntry {
  id: string;
  center_id: string;
  center_name: string;
  billing_month: string;
  plan_name: string;
  plan_amount: number;
  student_count: number;
  extra_students: number;
  extra_amount: number;
  storage_amount: number;
  total_amount: number;
  payment_status: string;
  notes: string | null;
  created_date: string;
}

export interface SubscriptionDashboard {
  total_centers: number;
  active_subscriptions: number;
  free_plan_count: number;
  paid_plan_count: number;
  mrr: number;
  total_extra_student_revenue: number;
  total_storage_addon_revenue: number;
  plan_breakdown: { name: string; count: number; revenue: number }[];
}

// ── API calls ────────────────────────────────────────────────────────────────

export const getSubscriptionPlans = (includeInactive = false) =>
  apiClient.get<SubscriptionPlan[]>('/admin/subscription/plans', { params: includeInactive ? { include_inactive: true } : {} }).then((r) => r.data);

export const createPlan = (body: {
  name: string; price: number; student_limit: number;
  storage_limit_mb: number; extra_student_price: number;
  sort_order?: number; is_active?: boolean;
}) => apiClient.post<SubscriptionPlan>('/admin/subscription/plans', body).then((r) => r.data);

export const updatePlan = (id: string, body: Partial<{
  name: string; price: number; student_limit: number;
  storage_limit_mb: number; extra_student_price: number;
  sort_order: number; is_active: boolean;
}>) => apiClient.patch<SubscriptionPlan>(`/admin/subscription/plans/${id}`, body).then((r) => r.data);

export const deletePlan = (id: string) =>
  apiClient.delete<{ message: string }>(`/admin/subscription/plans/${id}`).then((r) => r.data);

export const getStorageAddOns = (includeInactive = false) =>
  apiClient.get<StorageAddOn[]>('/admin/subscription/storage-addons', {
    params: includeInactive ? { include_inactive: true } : {},
  }).then((r) => r.data);

export const createStorageAddOn = (body: {
  name: string; storage_mb: number; price: number; sort_order?: number; is_active?: boolean;
}) => apiClient.post<StorageAddOn>('/admin/subscription/storage-addons', body).then((r) => r.data);

export const updateStorageAddOn = (id: string, body: Partial<{
  name: string; storage_mb: number; price: number; sort_order: number; is_active: boolean;
}>) => apiClient.patch<StorageAddOn>(`/admin/subscription/storage-addons/${id}`, body).then((r) => r.data);

export const deleteStorageAddOn = (id: string) =>
  apiClient.delete<{ message: string }>(`/admin/subscription/storage-addons/${id}`).then((r) => r.data);

export const getSubscriptionDashboard = () =>
  apiClient.get<SubscriptionDashboard>('/admin/subscription/dashboard').then((r) => r.data);

export const getCenterSubscriptions = (params: {
  search?: string;
  plan_name?: string;
  page?: number;
  size?: number;
}) =>
  apiClient
    .get<PagedResponse<CenterSubscriptionSummary>>('/admin/subscription/centers', { params })
    .then((r) => r.data);

export const getCenterSubscriptionDetail = (centerId: string) =>
  apiClient
    .get<CenterSubscriptionDetail>(`/admin/subscription/centers/${centerId}`)
    .then((r) => r.data);

export const assignPlan = (
  centerId: string,
  body: { plan_id: string; effective_date?: string; end_date?: string; notes?: string },
) =>
  apiClient
    .post<{ message: string }>(`/admin/subscription/centers/${centerId}/assign-plan`, body)
    .then((r) => r.data);

export const purchaseStorage = (centerId: string, body: { add_on_id: string }) =>
  apiClient
    .post<{ message: string }>(`/admin/subscription/centers/${centerId}/storage`, body)
    .then((r) => r.data);

export const refreshUsage = (centerId: string) =>
  apiClient
    .post<{ message: string; data: { student_count: number } }>(
      `/admin/subscription/centers/${centerId}/refresh-usage`,
    )
    .then((r) => r.data);

export const generateBill = (centerId: string) =>
  apiClient
    .post<{ message: string; data: { billing_month: string; total_amount: number } }>(
      `/admin/subscription/centers/${centerId}/generate-bill`,
    )
    .then((r) => r.data);

export const generateAllBills = () =>
  apiClient
    .post<{ message: string; data: { billing_month: string; created: number; skipped: number } }>(
      '/admin/subscription/generate-all-bills',
    )
    .then((r) => r.data);

export interface BillingSummary {
  billing_month: string;
  mrr: number;
  total_bills: number;
  total_amount: number;
  collected: number;
  outstanding: number;
  overdue: number;
  waived: number;
  paid_count: number;
  pending_count: number;
  overdue_count: number;
}

export const getBillingSummary = (month?: string) =>
  apiClient
    .get<BillingSummary>('/admin/subscription/billing-summary', { params: month ? { month } : {} })
    .then((r) => r.data);

export const sendInvoiceEmail = (billingId: string) =>
  apiClient
    .post<{ message: string; data?: { to: string; from: string; cc: string; amount: number } }>(
      `/admin/subscription/billing/${billingId}/send-invoice`,
    )
    .then((r) => r.data);

export const getBillingHistory = (params: {
  center_id?: string;
  month?: string;
  payment_status?: string;
  page?: number;
  size?: number;
}) =>
  apiClient
    .get<PagedResponse<BillingHistoryEntry>>('/admin/subscription/billing', { params })
    .then((r) => r.data);

export const updateBillingStatus = (
  billingId: string,
  body: { payment_status: string; notes?: string },
) =>
  apiClient
    .patch<{ message: string }>(`/admin/subscription/billing/${billingId}`, body)
    .then((r) => r.data);
