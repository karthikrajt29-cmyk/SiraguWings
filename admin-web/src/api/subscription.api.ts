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

export interface OwnerCenterRef {
  center_id: string;
  center_name: string;
  student_count: number;
}

export interface OwnerSubscriptionSummary {
  owner_id: string;
  owner_name: string;
  owner_email: string | null;
  owner_mobile: string | null;
  plan_id: string;
  plan_name: string;
  plan_price: number;
  student_limit: number;
  storage_limit_mb: number;
  extra_student_price: number;
  start_date: string;
  end_date: string | null;
  status: string;
  center_count: number;
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

export interface OwnerSubscriptionDetail extends OwnerSubscriptionSummary {
  centers: OwnerCenterRef[];
  storage_purchases: StoragePurchase[];
  billing_history: BillingHistoryEntry[];
}

export interface BillingHistoryEntry {
  id: string;
  owner_id: string;
  owner_name: string;
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
  total_owners: number;
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

export const getOwnerSubscriptions = (params: {
  search?: string;
  plan_name?: string;
  page?: number;
  size?: number;
}) =>
  apiClient
    .get<PagedResponse<OwnerSubscriptionSummary>>('/admin/subscription/owners', { params })
    .then((r) => r.data);

export const getOwnerSubscriptionDetail = (ownerId: string) =>
  apiClient
    .get<OwnerSubscriptionDetail>(`/admin/subscription/owners/${ownerId}`)
    .then((r) => r.data);

export const assignPlan = (
  ownerId: string,
  body: { plan_id: string; effective_date?: string; end_date?: string; notes?: string },
) =>
  apiClient
    .post<{ message: string }>(`/admin/subscription/owners/${ownerId}/assign-plan`, body)
    .then((r) => r.data);

export const purchaseStorage = (ownerId: string, body: { add_on_id: string }) =>
  apiClient
    .post<{ message: string }>(`/admin/subscription/owners/${ownerId}/storage`, body)
    .then((r) => r.data);

export const generateBill = (ownerId: string) =>
  apiClient
    .post<{ message: string; data: { billing_month: string; total_amount: number } }>(
      `/admin/subscription/owners/${ownerId}/generate-bill`,
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
  owner_id?: string;
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
