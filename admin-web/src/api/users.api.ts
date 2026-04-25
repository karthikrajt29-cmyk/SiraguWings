import apiClient from './client';
import type { PagedResponse } from './centers.api';

export interface UserRole {
  role: string;
  center_id: string | null;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string | null;
  mobile_number: string | null;
  status: string;
  roles: UserRole[];
  created_date: string;
}

export interface UserDetail extends UserSummary {
  preferred_language: string;
  device_platform: string | null;
  failed_login_attempts: number;
  last_login_at: string | null;
  center_connections: Array<{
    center_id: string;
    center_name: string;
    role: string;
  }>;
}

export interface UnlinkRequestSummary {
  id: string;
  parent_name: string;
  center_name: string;
  student_name: string;
  reason: string | null;
  created_date: string;
  status: string;
}

export const getUsers = (params: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  size?: number;
}) => apiClient.get<PagedResponse<UserSummary>>('/admin/users', { params }).then((r) => r.data);

export const getUserDetail = (id: string) =>
  apiClient.get<UserDetail>(`/admin/users/${id}`).then((r) => r.data);

export const updateUserStatus = (id: string, body: { status: string; reason?: string }) =>
  apiClient.patch(`/admin/users/${id}/status`, body).then((r) => r.data);

export const updateUser = (id: string, body: { name?: string; email?: string }) =>
  apiClient.patch<{ message: string }>(`/admin/users/${id}`, body).then((r) => r.data);

export const resetUserPassword = (id: string) =>
  apiClient.post<{ message: string; data: { reset_link: string } }>(`/admin/users/${id}/reset-password`).then((r) => r.data);

export const createUser = (body: {
  name: string; email: string; mobile_number: string;
  role?: string; center_id?: string;
}) => apiClient.post<{ message: string; data: { user_id: string; reset_link: string } }>('/admin/users', body).then((r) => r.data);

export const deleteUser = (id: string) =>
  apiClient.delete<{ message: string }>(`/admin/users/${id}`).then((r) => r.data);

export const addUserRole = (id: string, body: { role: string; center_id?: string }) =>
  apiClient.post<{ message: string }>(`/admin/users/${id}/roles`, body).then((r) => r.data);

export const removeUserRole = (id: string, role: string, center_id?: string | null) =>
  apiClient.delete<{ message: string }>(`/admin/users/${id}/roles`, {
    params: { role, ...(center_id ? { center_id } : {}) },
  }).then((r) => r.data);

export const getUserStats = () =>
  apiClient.get<{
    total: number; active: number; suspended: number;
    by_role: Record<string, number>;
  }>('/admin/users/stats').then((r) => r.data);

export interface StudentCenterLink {
  center_id: string;
  center_name: string;
  link_status: string;
  invite_status: string;
  enrolled_at: string | null;
}

export interface ParentStudent {
  id: string;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  profile_image_url: string | null;
  centers: StudentCenterLink[];
}

export const getUserStudents = (id: string) =>
  apiClient.get<ParentStudent[]>(`/admin/users/${id}/students`).then((r) => r.data);

export interface CreateStudentForParentBody {
  name: string;
  date_of_birth: string;   // YYYY-MM-DD
  gender: string;
  medical_notes?: string | null;
}

export const createStudentForParent = (parentId: string, body: CreateStudentForParentBody) =>
  apiClient
    .post<{ student_id: string; message: string }>(`/admin/users/${parentId}/students`, body)
    .then((r) => r.data);

export const getUnlinkRequests = (params: { page?: number; size?: number }) =>
  apiClient
    .get<PagedResponse<UnlinkRequestSummary>>('/admin/unlink-requests', { params })
    .then((r) => r.data);

export const approveUnlinkRequest = (id: string) =>
  apiClient.patch(`/admin/unlink-requests/${id}/approve`).then((r) => r.data);

export const rejectUnlinkRequest = (id: string, body: { rejection_reason: string }) =>
  apiClient.patch(`/admin/unlink-requests/${id}/reject`, body).then((r) => r.data);
