import apiClient from './client';
import type { PagedResponse } from './centers.api';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  status: string;
  roles: string[];
  created_date: string;
}

export interface UserDetail extends UserSummary {
  center_connections: Array<{
    center_id: string;
    center_name: string;
    role: string;
    status: string;
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

export const getUnlinkRequests = (params: { page?: number; size?: number }) =>
  apiClient
    .get<PagedResponse<UnlinkRequestSummary>>('/admin/unlink-requests', { params })
    .then((r) => r.data);

export const approveUnlinkRequest = (id: string) =>
  apiClient.patch(`/admin/unlink-requests/${id}/approve`).then((r) => r.data);

export const rejectUnlinkRequest = (id: string, body: { rejection_reason: string }) =>
  apiClient.patch(`/admin/unlink-requests/${id}/reject`, body).then((r) => r.data);
