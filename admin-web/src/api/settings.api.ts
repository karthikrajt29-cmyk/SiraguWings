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
