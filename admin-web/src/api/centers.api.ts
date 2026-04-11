import apiClient from './client';

export interface CenterSummary {
  id: string;
  name: string;
  category: string;
  owner_name: string;
  mobile_number: string;
  city: string;
  registration_status: string;
  subscription_status: string;
  created_date: string;
  approved_at: string | null;
  is_approaching_sla: boolean;
  hours_since_submission: number | null;
  // legacy compat
  status?: string;
}

export interface CenterDetail {
  id: string;
  name: string;
  category: string;
  owner_name: string;
  mobile_number: string;
  city: string;
  state: string;
  pincode: string | null;
  registration_status: string;
  subscription_status: string;
  created_date: string;
  approved_at: string | null;
  hours_since_submission: number | null;
  is_approaching_sla: boolean;
  address: string;
  latitude: number | null;
  longitude: number | null;
  operating_days: string;
  operating_timings: string;
  age_group: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  fee_range: string | null;
  facilities: string | null;
  social_link: string | null;
  website_link: string | null;
  rejection_reason: string | null;
  rejection_category: string | null;
  admin_notes: string | null;
  registration_cert_url: string | null;
  premises_proof_url: string | null;
  owner_id_proof_url: string | null;
  safety_cert_url: string | null;
  trial_ends_at: string | null;
  suspended_at: string | null;
  data_purge_at: string | null;
}

export interface CenterUser {
  user_id: string;
  name: string;
  email: string | null;
  mobile_number: string;
  role: string;
  status: string;
  joined_at: string | null;
}

export interface CenterUpdatePayload {
  name?: string;
  category?: string;
  owner_name?: string;
  mobile_number?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  description?: string;
  operating_days?: string;
  operating_timings?: string;
  age_group?: string;
  fee_range?: string;
  facilities?: string;
  social_link?: string;
  website_link?: string;
  admin_notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  logo_url?: string | null;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
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

export interface CreateCenterPayload {
  name: string;
  category: string;
  owner_name: string;
  mobile_number: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  operating_days: string;
  operating_timings: string;
  age_group: string;
  description?: string;
  fee_range?: string;
  facilities?: string;
  social_link?: string;
  website_link?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export const createCenter = (payload: CreateCenterPayload) =>
  apiClient.post<CenterDetail>('/admin/centers', payload).then((r) => r.data);

export const updateCenter = (id: string, payload: CenterUpdatePayload) =>
  apiClient.patch(`/admin/centers/${id}`, payload).then((r) => r.data);

export const getCenterUsers = (id: string) =>
  apiClient.get<CenterUser[]>(`/admin/centers/${id}/users`).then((r) => r.data);

export const addCenterUser = (id: string, body: { mobile_number: string; role: string }) =>
  apiClient.post(`/admin/centers/${id}/users`, body).then((r) => r.data);

export interface Batch {
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
}

export const getCenterBatches = (id: string) =>
  apiClient.get<Batch[]>(`/admin/centers/${id}/batches`).then((r) => r.data);

export interface BatchCreatePayload {
  course_name: string;
  batch_name: string;
  category_type?: string;
  class_days: string;
  start_time: string;
  end_time: string;
  strength_limit?: number | null;
  fee_amount: number;
  teacher_id?: string | null;
}

export const createBatch = (id: string, body: BatchCreatePayload) =>
  apiClient.post<Batch>(`/admin/centers/${id}/batches`, body).then((r) => r.data);

export const uploadCenterLogo = (id: string, file: File): Promise<string> => {
  const form = new FormData();
  form.append('file', file);
  return apiClient
    .post<{ message: string; data: { logo_url: string } }>(`/admin/centers/${id}/logo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data.data.logo_url);
};
