import apiClient from './client';

export interface PlatformSettings {
  TrialPeriodDays: number;
  FeePerStudent: number;
  SlaBreachHours: number;
  DataPurgeDelayDays: number;
  MaterialVisibilityMode: string;
  MaxStudentsPerCenter: number;
  BulkApproveLimit: number;
}

export const getSettings = () =>
  apiClient.get<PlatformSettings>('/admin/settings').then((r) => r.data);

export const updateMaterialVisibility = (mode: string) =>
  apiClient
    .patch('/admin/settings/material-visibility', { value: mode })
    .then((r) => r.data);

export const updateConfigKey = (config_key: string, value: string | number) =>
  apiClient.patch(`/admin/settings/${config_key}`, { value }).then((r) => r.data);

export interface BillingEmailSettings {
  billing_email_from: string;
  billing_email_cc: string;
  billing_email_bcc: string;
  billing_due_days: number;
  billing_reminder_days: number;
  billing_send_on_generate: string; // "true" | "false"
}

export const getBillingEmailSettings = () =>
  apiClient.get<BillingEmailSettings>('/admin/settings/billing-email').then((r) => r.data);

export const updateBillingEmailSettings = (body: Partial<{
  billing_email_from: string;
  billing_email_cc: string;
  billing_email_bcc: string;
  billing_due_days: number;
  billing_reminder_days: number;
  billing_send_on_generate: boolean;
}>) =>
  apiClient.patch<{ message: string }>('/admin/settings/billing-email', body).then((r) => r.data);
