import apiClient from './client';

export interface CenterSummary {
  id: string;
  name: string;
  category: string;
  status: string;
  owner_name: string;
  submitted_at: string;
  is_approaching_sla: boolean;
  hours_since_submission: number;
}

export interface CenterDetail extends CenterSummary {
  address: string;
  city: string;
  pincode: string;
  phone: string;
  email: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  documents: Array<{ type: string; url: string; verified: boolean }>;
  notes: string | null;
  trial_ends_at: string | null;
  suspended_at: string | null;
  data_purge_at: string | null;
  rejection_category: string | null;
  rejection_reason: string | null;
  map_pin_warning: boolean;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export const getCenters = (params: {
  status?: string;
  page?: number;
  size?: number;
}) => apiClient.get<PagedResponse<CenterSummary>>('/admin/centers', { params }).then((r) => r.data);

export const getCenterDetail = (id: string) =>
  apiClient.get<CenterDetail>(`/admin/centers/${id}`).then((r) => r.data);

export const reviewCenter = (id: string) =>
  apiClient.patch(`/admin/centers/${id}/review`).then((r) => r.data);

export const approveCenter = (id: string, notes?: string) =>
  apiClient.patch(`/admin/centers/${id}/approve`, { notes }).then((r) => r.data);

export const rejectCenter = (
  id: string,
  body: { rejection_category: string; rejection_reason: string },
) => apiClient.patch(`/admin/centers/${id}/reject`, body).then((r) => r.data);

export const suspendCenter = (id: string, body: { reason: string }) =>
  apiClient.patch(`/admin/centers/${id}/suspend`, body).then((r) => r.data);

export const reinstateCenter = (id: string) =>
  apiClient.patch(`/admin/centers/${id}/reinstate`).then((r) => r.data);

export const bulkApproveCenters = (center_ids: string[]) =>
  apiClient.post('/admin/centers/bulk-approve', { center_ids }).then((r) => r.data);
