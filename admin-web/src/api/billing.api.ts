import apiClient from './client';
import type { PagedResponse } from './centers.api';

export interface BillingDashboard {
  mrr: number;
  billed_students: number;
  outstanding_amount: number;
  overdue_amount: number;
  active_centers: number;
}

export interface CenterBillingSummary {
  center_id: string;
  center_name: string;
  subscription_status: string;
  student_count: number;
  monthly_amount: number;
  invoice_status: string | null;
  trial_ends_at: string | null;
}

export interface InvoiceSummary {
  id: string;
  center_id: string;
  center_name: string;
  billing_period_start: string;
  billing_period_end: string;
  total_amount: number;
  status: string;
  due_date: string;
  issued_date: string;
}

export interface InvoiceDetail extends InvoiceSummary {
  line_items: Array<{ description: string; quantity: number; unit_price: number; total: number }>;
  payments: Array<{ payment_date: string; amount: number; method: string; reference: string }>;
}

export const getBillingDashboard = () =>
  apiClient.get<BillingDashboard>('/admin/billing/dashboard').then((r) => r.data);

export const getBillingCenters = (params: {
  subscription_status?: string;
  page?: number;
  size?: number;
}) =>
  apiClient
    .get<PagedResponse<CenterBillingSummary>>('/admin/billing/centers', { params })
    .then((r) => r.data);

export const waiveFee = (
  center_id: string,
  body: { invoice_id: string; waive_reason: string },
) => apiClient.patch(`/admin/billing/centers/${center_id}/waive`, body).then((r) => r.data);

export const extendTrial = (center_id: string, body: { extension_days: number }) =>
  apiClient
    .patch(`/admin/billing/centers/${center_id}/extend-trial`, body)
    .then((r) => r.data);

export const getInvoices = (params: { status?: string; page?: number; size?: number }) =>
  apiClient
    .get<PagedResponse<InvoiceSummary>>('/admin/billing/invoices', { params })
    .then((r) => r.data);

export const getInvoiceDetail = (id: string) =>
  apiClient.get<InvoiceDetail>(`/admin/billing/invoices/${id}`).then((r) => r.data);
